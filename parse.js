/*
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

const TokenType = {
	CONSTANT: Symbol("Constant"),
	OPERATOR: Symbol("Operator"),
	BRACKET: Symbol("Bracket"),
};

const Operation = {
	INVERT: Symbol("Invert"),
	NEGATE: Symbol("Negate"),
	ADD: Symbol("Add"),
	SUBTRACT: Symbol("Subtract"),
	MULTIPLY: Symbol("Multiply"),
	DIVIDE: Symbol("Divide"),
	EXPONENTIATE: Symbol("Exponentiate"),
	ASSIGN: Symbol("Assign"),
	SINE: Symbol("Sin"),
	LOG: Symbol("Log"),
};

const Precedence = [
	[Operation.INVERT],
	[Operation.NEGATE],
	[
	Operation.SINE,
	Operation.LOG
	],
	[Operation.EXPONENTIATE],
	[
	Operation.MULTIPLY, 
	Operation.DIVIDE,
	],
	[
	Operation.ADD,
	Operation.SUBTRACT,
	],
	[Operation.ASSIGN],
];
Precedence.reverse(); // IMPORTANT

Precedence.next = op => Precedence.find(a => a.includes(op)) + 1;

const OP_MAP = new Map([
	['!', Operation.NEGATE],
	['+', Operation.ADD],
	['-', Operation.SUBTRACT],
	['*', Operation.MULTIPLY],
	['/', Operation.DIVIDE],
	['^', Operation.EXPONENTIATE],
	['=', Operation.ASSIGN],
	['s', Operation.SINE],
	['l', Operation.LOG],
]);

if (globalThis.process) main(process.argv);

function main(args) {
	const input = args[2];
	
	if (!input) {
		console.error("No arguments supplied!");
		return;
	}
	
	var tokens = tokenize(input);
	var expression = parse(tokens);
	expression.raw = input;
	
	var output = JSON.stringify(expression, (key, value) => {
		if (typeof value == 'symbol') return value.description;
		return value;
	}, '\t');
	console.log(output);
	
	return output;
}

function tokenize(input) {
	var tokens = [];
	
	var constant;
	for (let i = 0; i < input.length; ++i) {
		// Parse constants (numbers)
		constant = "";
		while (true) {
			if (isNaN(parseInt(input[i], 10))) {
				if (constant) --i;
				break;
			}
			constant += input[i++];
		}
		if (constant) {
			tokens.push({type: TokenType.CONSTANT, value: parseInt(constant, 10)});
			continue;
		}
		
		// Parse operators
		if (OP_MAP.has(input[i])) {
			tokens.push({type: TokenType.OPERATOR, value: OP_MAP.get(input[i])});
			continue;
		}
		
		// Parse brackets
		if (input[i] == '(' || input[i] == ')') {
			tokens.push({type: TokenType.BRACKET, value: {open: input[i] == '('}});
			continue;
		}
		
		// Skip whitespace
		if (input[i] == ' ') continue;
		
		// Unknown token, so break out of the loop
		break;
	}
	
	return tokens;
}

function parse(tokens, precedence = 0) {
	var expression = {op: undefined, args: []};
	
	// Unpack a sub-expression (remove the surrounding brackets)
	if (tokens[0].type == TokenType.BRACKET && tokens[tokens.length - 1].type == TokenType.BRACKET) tokens = tokens.slice(1, tokens.length - 1);
	
	switch (Precedence[precedence] ? Precedence[precedence][0] : undefined) {
		case Operation.INVERT:
			if (tokens[0].value == Operation.SUBTRACT) {
				expression.op = Operation.INVERT;
				push_sub_exp_as_arg(1);
			} else return next();
			break;
		case Operation.NEGATE:
			if (tokens[0].type == (expression.op = Operation.NEGATE)) {
				push_sub_exp_as_arg(1);
			} else return next();
			break;
		case Operation.SINE:
		case Operation.LOG:
			if (
				(tokens[tokens.length - 1].value  == (expression.op = Operation.SINE))
				||
				(tokens[tokens.length - 1].value  == (expression.op = Operation.LOG))
			) {
				push_sub_exp_as_arg(0, -1);
			} else return next();
			break;
		case Operation.EXPONENTIATE:
		case Operation.MULTIPLY:
		case Operation.DIVIDE:
		case Operation.ADD:
		case Operation.SUBTRACT:
		case Operation.ASSIGN:
			parse_infix(Precedence[precedence], Precedence[precedence][0] != Operation.ASSIGN);
			break;
		default:
			return tokens[0].value;
	}
	return expression;
	
	function parse_infix(ops, left_assoc = true) {
		var op_pos = find_token_index_by_types(ops, left_assoc ? -1 : +1);
		if (op_pos < 1) return expression = next();
		expression.op = tokens[op_pos].value;
		push_sub_exp_as_arg(0, op_pos);
		push_sub_exp_as_arg(op_pos + 1);
	}
	
	function find_token_index_by_types(types, direction = +1) {
		for (let i = (direction > 0 ? 0 : tokens.length - 1); direction > 0 ? i < tokens.length : i >= 0; i += direction) {
			// Skip sub-expressions (which are in brackets)
			if (tokens[i].type == TokenType.BRACKET) {
				var open = 1;
				do {
					if (tokens[i += direction].type == TokenType.BRACKET) {
						open += (direction > 0 ? tokens[i].value.open : !tokens[i].value.open) ? +1 : -1;
						continue;
					}
				} while (open > 0);
			}
			
			if (types.includes(tokens[i].value)) return i;
		}
		return -1;
	}
	
	function push_sub_exp_as_arg(start, end) {
		var sub_exp = parse(tokens.slice(start, end));
		expression.args.push(sub_exp);
	}
	
	function next() {
		return parse(tokens, precedence + 1);
	}
}
