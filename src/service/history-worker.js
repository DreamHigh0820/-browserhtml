/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
'use strict';

const {Page, History} = require('../common/history');
const {async} = require('../lang/task');
const URI = require('../common/url-helper');

// Calculates the score for use in suggestions from
// a result array `match` of `RegExp#exec`.
const score = (pattern, input='', base=0.3, length=0.25) => {
    const index = 1 - base - length
    const text = String(input);
    const count = text.length;
    const match = pattern.exec(text);

    return !match ? -1 :
            base +
            length * Math.sqrt(match[0].length / count) +
            index * (1 - match.index / count);
}

const Pattern = (input, flags="i") => {
  try {
    return RegExp(input, flags)
  } catch (error) {
    if (error instanceof SyntaxError) {
      return RegExp(Pattern.escape(input), flags)
    }
    throw error
  }
}
Pattern.escape = input => input.replace(/[\.\?\*\+\^\$\|\(\)\{\[\]\\]/g, '\\$&')

  const isTopHit = page => page.isTopHit;

  const pageSearch = async(function*(db, {id, input, limit}) {
    const {rows} = yield db.query({docs: true, type: 'Page'});
    // Build a query patter from all words and individual words, note that
    // scoring will take into consideration the length of the match so if we match
    // multiple words that gets larger score then if we matched just one.

    const terms = input.split(/\s+/g);
    const domainQuery = terms.length === 1 ? Pattern(terms[0]) : null;
    const query = Pattern(terms.join('[\\s\\S]+') + '|' + terms.join('|'));
    const matches = rows.map(({doc: page}) => {
      const domain = URI.getDomainName(page.uri);
      const pathname = URI.getPathname(page.uri);

      // frequency score is ranked from 0-1 not based on quality of
      // match but solely on how often this page has been visited in the
      // past.
      const frequencyScore = 1 - (0.7 / (1 + page.visits.length));
      // Title and uri are scored based of input length & match length
      // and match index.
      const titleScore = score(query, page.title);
      const uriScore = score(query, page.uri);
      const domainScore = domainQuery ? score(domainQuery, domain) : 0;
      const pathScore = domainQuery ? score(domainQuery, pathname) : 0;

      // Store each score just for debuging purposes.
      page.frequencyScore = frequencyScore;
      page.titleScore = titleScore;
      page.domainScore = domainScore;
      page.uriScore = uriScore;
      page.domain = domain;

      // Total score is ranked form `-1` to `1`. Individual score has certain
      // impact it can have on overal score which expressed by multiplication
      // with a percentage of the impact it may have. No match on individual
      // field has a negative impact (again besed on it's impact weight).
      page.score = frequencyScore * 40/100 +
                   titleScore * 17/100 +
                   domainScore * 25/100 +
                   pathScore * 13/100 +
                   uriScore * 5/100;
      page.isTopHit = domainQuery && domain.startsWith(domainQuery.source);

      return page;
    })
    .filter(page => page.score > 0 && page.title)
    // order by score.
    .sort((a, b) =>
      a.score > b.score ? -1 :
      a.score < b.score ? 1 :
      0);

    const topIndex = matches.findIndex(isTopHit);
    const topHit = topIndex < 0 ? null :
                   matches.splice(topIndex, 1)[0];
    return {
      type: 'PageResult',
      action: {
        id, topHit,
        matches: matches.slice(0, limit)
      }
    };
  });

  const history = new History({trackTopPages: true});

  onmessage = ({data: {type, id, action}}) => {
    if (type === 'LoadEnded') {
      history.edit(Page.from({uri: action.uri}),
                   Page.beginVisit({id, time: action.timeStamp}));
    }

    if (type === 'LocationChanged') {
      history.edit(Page.from({uri: action.uri}),
                   Page.endVisit({id, time: action.timeStamp}));
    }

    if (type === 'TitleChanged') {
      history.edit(Page.from({uri: action.uri}),
                   page => page.set('title', action.title));
    }

    if (type === 'ThumbnailChanged') {
      history.edit(Page.from({uri: action.uri}),
                   page => page.set('image', action.image));
    }

    if (type === 'IconChanged') {
      history.edit(Page.from({uri: action.uri}),
                   page => page.set('icon', action.icon.href));
    }

    if (type === 'PageQuery') {
      pageSearch(history, action).then(postMessage);
    }
  }
