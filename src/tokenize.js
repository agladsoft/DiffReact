import {tokenize, markEdits, pickRanges} from 'react-diff-view';
import {flatMap} from 'lodash';

const TOKEN_TYPE_SPACE = 'space';

function getIndicesOf(searchStr, str, caseSensitive) {
    var searchStrLen = searchStr.length;
    if (searchStrLen === 0) {
        return [];
    }
    var startIndex = 0, index, indices = [];
    if (!caseSensitive) {
        str = str.toLowerCase();
        searchStr = searchStr.toLowerCase();
    }
    while ((index = str.indexOf(searchStr, startIndex)) > -1) {
        indices.push(index);
        startIndex = index + searchStrLen;
    }
    return indices;
}

const findLeadingRangeSpace = (spaces, change, pos) => {
    return spaces
        ? {
              type: TOKEN_TYPE_SPACE,
              lineNumber: change.lineNumber,
              start: pos,
              length: spaces.length,
              properties: {value: spaces},
          }
        : null;
};

const pickLeadingAndTrailingSpaces = hunks => {
    const changes = flatMap(hunks, hunk => hunk.changes);
    const [oldRanges, newRanges] = changes.reduce(
        ([oldRanges, newRanges], change) => {
            const [spaces] = /\s/.exec(change);
            var indices = getIndicesOf(spaces, change.content);
            for (const pos of indices) {
                const leadingRangeSpace = findLeadingRangeSpace(spaces, change, pos);
                const pushRange = ranges => {
                    leadingRangeSpace && ranges.push(leadingRangeSpace);
                };

                if (!change.isInsert) {
                    pushRange(oldRanges);
                }
                if (!change.isDelete) {
                    pushRange(newRanges);
                }
              }

            return [oldRanges, newRanges];
        },
        [[], []],
    );
    return pickRanges(oldRanges, newRanges);
};

export default hunks => {
    if (!hunks) {
        return undefined;
    }
    const options = {
        highlight: false,
        enhancers: [
            markEdits(hunks, {type: 'block'}),
            pickLeadingAndTrailingSpaces(hunks)
        ]
    };

    try {
        return tokenize(hunks, options);
    } catch (ex) {
        return undefined;
    }
};
