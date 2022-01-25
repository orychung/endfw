class escapeState {
	constructor(lookup, stateList) {
		this.lookup = lookup;
		this.stateList = stateList;
	}
	indexIn(script, start, naiveEnd) {
		// console.log('indexIn:', start, naiveEnd, this);
		return (
			this
			.stateList
			.map(x=>[script.indexOf(this.lookup[x][1], start), x])
			.filter(x=>(x[0] > -1) && (x[0]+this.lookup[x[1]][2].length <= naiveEnd))
			.sortBy(x=>x[0])
			[0]
		);
	}
}

class escapeList {
	constructor(patterns, isQuote=()=>false) {
		this.patterns = patterns;
		this.isQuote = isQuote;
		this.lookup = {};
		this.patterns.forEach(x=>{
			if (!(x instanceof Array))
				throw Error('Each pattern must be [state, starting, ending, [childEscapeName1, childEscapeName2, ...]]');
			x[3] = new escapeState(this.lookup, x[3]);
			this.lookup[x[0]] = x;
		});
		this.lookup.root = ['root', undefined, undefined, new escapeState(this.lookup, this.patterns.map(x=>x[0]))];
	}
	parse(script) {
		// results in tokenTree
		var token = new tokenTree();
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
				naiveEnd = script.indexOf(this.lookup[token.state][2], start);
			}
			if (naiveEnd == -1 || naiveEnd > end)
				throw Error('Pattern is not closed: '+JSON.stringify({state: token.state, start: start}));
			var hit = this.lookup[token.state][3].indexIn(script, start, naiveEnd);
			if (hit) {
				this.feedToken(script, start, hit[0], token);
				var childPattern = this.lookup[hit[1]];
				var childToken = token.addChild(...childPattern);
				start = this.p(script, hit[0]+this.lookup[hit[1]][1].length, end, childToken);
				if (start >= end) return end;
			} else {
				this.feedToken(script, start, naiveEnd, token);
				if (naiveEnd == end) return end;
				if (naiveEnd < end) return naiveEnd+this.lookup[token.state][2].length;
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

class tokenTree {
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
			toString: this.toString
			
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

// for being imported as node module
if (typeof module === 'undefined') {
    // skip if not running node
} else {
    module.exports = {
		escapeList: escapeList,
        tokenTree: tokenTree
    }
}
