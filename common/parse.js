"use strict";
var TokenTree = class TokenTree {
	constructor() {
		this.state = 'root';
		this.starting = '';
		this.ending = '';
		this.children = [];
	}
	addChild(state, starting, ending) {
		var childToken = {
			state: state,
			starting: starting,
			ending: ending,
			children: [],
			parent: this,
			addChild: this.addChild,
			toString: this.toString,
		}
		this.children.push(childToken)
		return childToken;
	}
	toString() {
		return (
			this.starting
			+(this.text || this.children.map(x=>x.toString()).join(' '))
			+this.ending
		);
	}
}

var EscapeState = class EscapeState {
  escapeMap = {} // typically pass the map from parent
  escapeNames = [] // escapes available in this state
	constructor(data) {Object.assign(this, data);}
	indexIn(script, start, naiveEnd) {
		// console.log('indexIn:', start, naiveEnd, this);
		return (
			this
			.escapeNames
			.map(x=>[script.indexOf(this.escapeMap[x][1], start), x])
			.filter(x=>(x[0] > -1) && (x[0]+this.escapeMap[x[1]][2].length <= naiveEnd))
			.sortBy(x=>x[0])
			[0]
		);
	}
}

var EscapeSyntax = class EscapeSyntax {
	constructor(options) {
		this.escapeMap = {};
		[
      ...options.escapes,
      ...options.quoteEscapes,
    ].forEach(x=>{
			if (!(x instanceof Array))
				throw Error('Each escape pattern must be [name, starting, ending, [childEscapeName1, childEscapeName2, ...]]');
			if (x[3]) x[3] = new EscapeState({
        escapeMap: this.escapeMap,
        escapeNames: x[3],
      });
			this.escapeMap[x[0]] = x;
		});
		this.escapeMap.root = [
      'root',
      undefined,
      undefined,
      new EscapeState({
        escapeMap: this.escapeMap,
        escapeNames: options.escapes.map(x=>x[0]),
      })
    ];
	}
  isQuote(state) {
    return (this.escapeMap[state][3]===undefined);
  }
	parse(script) {
		// returns TokenTree
		var token = new TokenTree();
		this.p(script, 0, script.length, token);
		return token;
	}
	p(script, start, end, token) {
		// console.log('p:', start, end, token);
		var naiveEnd;
		while (true) {
			if (token.state == 'root') {
				naiveEnd = end;
			} else {
				naiveEnd = script.indexOf(this.escapeMap[token.state][2], start);
			}
			if (naiveEnd == -1 || naiveEnd > end)
				throw Error('Pattern is not closed: '+JSON.stringify({state: token.state, start: start}));
			let hit = this.escapeMap[token.state][3]?.indexIn(script, start, naiveEnd);
			if (hit) {
				this.feedToken(script, start, hit[0], token);
				var childPattern = this.escapeMap[hit[1]];
				var childToken = token.addChild(...childPattern);
				start = this.p(script, hit[0]+this.escapeMap[hit[1]][1].length, end, childToken);
				if (start >= end) return end;
			} else {
				this.feedToken(script, start, naiveEnd, token);
				if (naiveEnd == end) return end;
				if (naiveEnd < end) return naiveEnd+this.escapeMap[token.state][2].length;
			}
		}
	}
	feedToken(script, start, end, token) {
		// assume space, newlines, tabs are always token separators
		if (this.isQuote(token.state)) {
			token.text = script.slice(start, end);
		} else {
			var tokens = (
				script
				.slice(start, end)
				.replace(/[\r\n\t]/g, ' ')
				.split(' ')
				.filter(x=>x.length>=1)
			);
			token.children = token.children.concat(tokens);
		}
	}
}

// for being imported as node module
if (typeof module === 'undefined') {
  // skip if not running node
} else {
  module.exports = {
    EscapeSyntax: EscapeSyntax,
    TokenTree: TokenTree
  }
}
