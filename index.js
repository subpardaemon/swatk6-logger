/**
 * swatk6/logger
 * @version v1.5.0
 * @author Andras Kemeny
 * 
 * A simple logger that offers a retain-release feature for remote debugging.
 * 
 * LICENSE: MIT
 * (c) Andras Kemeny, subpardaemon@gmail.com
 */

/* global process */

var fs = require('fs'),
    os = require('os');

/**
 * The logger instance creator.
 * 
 * The opts.targets configuration:
 * ['*|!not,these,levels|these,levels','filename|?consolelog|?consolerror|?consoledebug|?consoletrace'[,'log_%format']]
 * 
 * Possible levels: 'trace','debug','info','info','warn','error','fatal','file'.
 * 
 * Multiple entries for one level is permitted (logging to many locations).
 * 
 * Filename substitutions:
 *  %p = process ID
 *  %h = hostname
 *  %L = log level
 *  %l = this.logLocation (only for 'file' type logs) 
 * 
 * Format substitutions for the opts.format configuration:
 *  %t = Date.toDateString()+' '+Date.toLocaleTimeString()
 *  %T = Date.toISOString()
 *  %j = Date.toJSON()
 *  %p = process ID
 *  %h = hostname
 *  %L = log level
 *  %E = system EOL
 *  %S = trace stack
 *  %m = message
 * 
 * @constructor
 * @param {Object} opts
 * @param {Array} opts.targets
 * @param {String} [opts.logLocation="./"]
 * @param {String} [opts.format="[%L][%p@%h] %t: %m%E"]
 * @param {Boolean} [opts.consoleNoFormat=false]
 * @param {Boolean} [opts.trace=false]
 * @param {Boolean} [opts.keepLast=false]
 * @param {Boolean} [opts.debug=true]
 * @param {Number} [opts.debugLevel=-1]
 * @returns {swatk6_logger}
 */
function swatk6_logger(opts) {
    var n, i, t, tt, x, neg, defaults = {
	targets: [
	    ['!warn,error,fatal,trace', '?consolelog'],
	    ['warn,error,fatal', '?consoleerror'],
	    ['trace', '?consoletrace']
	],
	logLocation: './',
	/*
	 */
	format: '[%L][%p@%h] %t: %m%E',
	consoleNoFormat: false,
	trace: false,
	keepLast: false,
	debug: true,
	debugLevel: -1
    };
    if (typeof opts !== 'undefined') {
	for (n in opts) {
	    if (opts.hasOwnProperty(n) && typeof defaults[n] !== 'undefined') {
		defaults[n] = opts[n];
	    }
	}
    }
    this.targets = [];
    this.location = defaults.logLocation;
    if (this.location.substr(this.location.length - 2, 1) === '/') {
	this.location = this.location.substr(0, this.location.length - 1);
    }
    this.doTrace = defaults.trace === true;
    this.doDebug = defaults.debug === true;
    this.debugLevel = defaults.debugLevel;
    this.keepLast = defaults.keepLast;
    this.entries = [];
    this.consoleNoFormat = defaults.consoleNoFormat === true;
    this.format = defaults.format;
    function targf(val) {
	var resf = x.indexOf(val) > -1;
	return resf === neg;
    }
    tt = ['trace', 'debug', 'info', 'info', 'warn', 'error', 'fatal', 'file'];
    for (i = 0; i < defaults.targets.length; i++) {
	t = defaults.targets[i];
	if (t.length === 2) {
	    t.push(this.format);
	}
	if (t[0] !== '*') {
	    neg = t[0].substr(0, 1) !== '!';
	    x = neg === false ? t[0].substr(1).split(',') : t[0].split(',');
	    x = tt.filter(targf);
	    this.targets.push([x, t[1], t[2]]);
	} else {
	    this.targets.push([tt, t[1], t[2]]);
	}
    }
    if (typeof os === 'undefined') {
	this.eol = "\n";
	this.hostname = 'localbrowser';
    } else {
	this.eol = os.EOL;
	this.hostname = os.hostname();
    }
}
/**
 * Fetch the log records and flush the entries.
 * @returns {Array}
 */
swatk6_logger.prototype.getEntries = function() {
    var out = [];
    while(this.entries.length>0) {
	out.push(this.entries.shift());
    }
    return out;
};
/**
 * Display entries (on console) derived from .getEntries() in a browser. 
 * @param {Array} entries
 * @param {Boolean} [reversed=false]
 * @returns {swatk6_logger}
 */
swatk6_logger.prototype.displayEntries = function(entries,reversed) {
    if (typeof reversed === 'undefined') {
	reversed = false;
    }
    if (entries.length > 0) {
	if (reversed === true) {
	    entries.reverse();
	}
	entries.forEach(function (entry) {
	    if (entry.level === 'debug' || entry.level === 'trace') {
		console.debug(entry.message);
	    } else if (entry.level === 'error' || entry.level === 'fatal') {
		console.error(entry.message);
	    } else if (entry.level === 'warn') {
		console.warn(entry.message);
	    } else if (entry.level === 'info') {
		console.info(entry.message);
	    } else {
		console.log(entry.message);
	    }
	}.bind(this));
    }
    return this;
};
/**
 * Return a normalized, no-frills timestamp string.
 * @private
 * @param {Date} d
 */
swatk6_logger.prototype.normalTS = function(d) {
    var out = d.getFullYear().toString() + '-';
    var m = d.getMonth();
    m++;
    out += m < 10 ? '0' + m.toString() : m.toString();
    out += '-';
    m = d.getDate();
    out += m < 10 ? '0' + m.toString() : m.toString();
    out += ' ';
    m = d.getHours();
    out += m < 10 ? '0' + m.toString() : m.toString();
    out += ':';
    m = d.getMinutes();
    out += m < 10 ? '0' + m.toString() : m.toString();
    out += ':';
    m = d.getSeconds();
    out += m < 10 ? '0' + m.toString() : m.toString();
    return out;
};
/**
 * Create the actual logline, using the format string from the setup, and the input arguments from the logging call.
 * @private
 * 
 * The following tokens are translated:
 * %t = Date.toDateString()+' '+Date.toLocaleTimeString()
 * %T = Date.toISOString()
 * %j = Date.toJSON()
 * %p = process ID
 * %h = hostname
 * %L = log level
 * %E = system EOL
 * %S = trace stack
 * %m = message
 * 
 * @param {String} format
 * @param {String} level
 * @returns {String}
 */
swatk6_logger.prototype.outputFormat = function(format,level) {
    var params = new Array(arguments.length);
    var i,j,ks;
    for(i = 0; i < params.length; ++i) {
        params[i] = arguments[i];
    }
    params.shift();
    params.shift();
    var d = new Date();
    var repls = {};
    if (format.indexOf('%t') > -1) {
	repls.t = this.normalTS(d);
	//repls.t = d.toDateString()+' '+d.toLocaleTimeString();
    }
    if (format.indexOf('%T') > -1) {
	repls.T = d.toISOString();
    }
    if (format.indexOf('%j') > -1) {
	repls.j = d.toJSON();
    }
    if (format.indexOf('%p') > -1) {
	if (typeof process === 'undefined') {
	    repls.p = '';
	} else {
	    repls.p = process.pid;
	}
    }
    if (format.indexOf('%h') > -1) {
	repls.h = this.hostname;
    }
    if (format.indexOf('%L') > -1) {
	if (level === 'file') {
	    repls.L = '';
	} else {
	    repls.L = level;
	}
    }
    if (format.indexOf('%E') > -1) {
	repls.E = this.eol;
    }
    if (format.indexOf('%S') > -1) {
	repls.S = new Error().stack;
    }
    var mesg = '';
    for (i = 0; i < params.length; i++) {
	if (mesg !== '') {
	    mesg += ' ';
	}
	if (typeof params[i] === 'object') {
	    try {
		mesg += JSON.stringify(params[i]);
	    } catch (e) {
		mesg += params[i].toString() + '(';
		ks = Object.keys(params[i]);
		for (j = 0; j < ks.length; j++) {
		    mesg += ks[j] + ',';
		}
		mesg += ')';
	    }
	} else if (typeof params[i] === 'undefined') {
	    mesg += '[undefined]';
	} else if (params[i] === null) {
	    mesg += '[null]';
	} else {
	    mesg += params[i].toString();
	}
    }
    repls.m = mesg;
    for (var n in repls) {
	if (repls.hasOwnProperty(n)) {
	    format = format.replace('%' + n, repls[n]);
	}
    }
    return format;
};
/**
 * Enable debug logging.
 * @returns {swatk6_logger}
 */
swatk6_logger.prototype.enableDebug = function() {
    this.doDebug = true;
    return this;
};
/**
 * Disable debug logging totally.
 * @returns {swatk6_logger}
 */
swatk6_logger.prototype.disableDebug = function() {
    this.doDebug = false;
    return this;
};
/**
 * Set the debug cutoff level for this instance.
 * @param {(Number|Boolean)} level if true, debugging is turned on with -1; if false, debugging is turned off; otherwise, it's a level definition
 * @returns {swatk6_logger}
 */
swatk6_logger.prototype.setDebugLevel = function(level) {
    if (level === true) {
	this.doDebug = true;
	this.debugLevel = -1;
    } else if (level === 0 || level === false) {
	this.doDebug = false;
    } else {
	this.doDebug = true;
	this.debugLevel = level;
    }
    return this;
};
/**
 * Enable tracing at the "trace" loglevel.
 * @returns {swatk6_logger}
 */
swatk6_logger.prototype.enableTrace = function() {
    this.doTrace = true;
    return this;
};
/**
 * Disable tracing at the "trace" loglevel.
 * @returns {swatk6_logger}
 */
swatk6_logger.prototype.disableTrace = function() {
    this.doTrace = false;
    return this;
};
/**
 * Make an actual logline and store it in the hold-release buffer if necessary.
 * @private
 * @returns {swatk6_logger}
 */
swatk6_logger.prototype.toTarget = function(level) {
    var params = new Array(arguments.length);
    var i;
    for (i = 0; i < params.length; ++i) {
	params[i] = arguments[i];
    }
    params.shift();
    if (level === 'trace' && this.doTrace === false) {
	return true;
    } else if (level === 'debug' && this.doDebug === false) {
	return true;
    }
    var overridefn = level === 'file' ? params.shift() : null;
    var entrystored = this.keepLast === false || this.keepLast === null ? true : false;
    for (i = 0; i < this.targets.length; i++) {
	if (this.targets[i][0].indexOf(level) > -1) {
	    var of = this.targets[i][2];
	    if (level === 'trace') {
		of += ' %S';
	    }
	    var car = Array.prototype.slice.call(params, 0);
	    car.unshift(level);
	    car.unshift(of);
	    var m = this.outputFormat.apply(this, car);
	    if (this.targets[i][1].substr(0, 1) === '?') {
		if (m.substr(m.length - this.eol.length) === this.eol) {
		    m = m.substr(0, m.length - this.eol.length);
		}
	    }
	    if (entrystored === false) {
		this.entries.push({level: level, message: m});
		if (this.entries.length > parseInt(this.keepLast)) {
		    this.entries.shift();
		}
		entrystored = true;
	    }
	    if (['?consolelog', '?consoleerror', '?consoledebug'].indexOf(this.targets[i][1]) > -1) {
		var rtarg = this.targets[i][1].substr(8);
		if (this.consoleNoFormat === true) {
		    console[rtarg].apply(console, params);
		} else {
		    console[rtarg].apply(console, [m]);
		}
	    } else if (this.targets[i][1] === '?consoletrace') {
		console.log(m);
	    } else if (typeof fs !== 'undefined') {
		var fn = overridefn !== null ? overridefn : this.targets[i][1];
		if (fn.indexOf('%') !== -1) {
		    var repls = {};
		    if (fn.indexOf('%p') > -1) {
			repls.p = process.pid;
		    }
		    if (fn.indexOf('%h') > -1) {
			repls.h = this.hostname;
		    }
		    if (fn.indexOf('%L') > -1) {
			repls.L = level;
		    }
		    if (level === 'file' && fn.indexOf('%l') > -1) {
			repls.l = this.location;
		    }
		    for (var n in repls) {
			if (repls.hasOwnProperty(n)) {
			    fn = fn.replace('%' + n, repls[n]);
			}
		    }
		}
		if (level !== 'file') {
		    fn = this.location + fn;
		}
		fs.appendFile(fn, m, 'utf8');
	    }
	}
    }
    return this;
};
/**
 * Log the arguments at the "log" level.
 * @param {...*} 
 * @returns {swatk6_logger}
 */
swatk6_logger.prototype.log = function() {
    var params = new Array(arguments.length);
    for(var i = 0; i < params.length; ++i) {
        params[i] = arguments[i];
    }
    return this.toTarget.apply(this,params);
};
/**
 * Log the arguments at the "trace" level, without respect to the current debug level cutoff.
 * @param {...*} 
 * @returns {swatk6_logger}
 */
swatk6_logger.prototype.trace = function() {
    var params = new Array(arguments.length);
    for(var i = 0; i < params.length; ++i) {
        params[i] = arguments[i];
    }
    params.unshift('trace');
    return this.toTarget.apply(this,params);
};
/**
 * Log the arguments at the "debug" level, without respect to the current debug level cutoff.
 * @param {...*} 
 * @returns {swatk6_logger}
 */
swatk6_logger.prototype.debug = function() {
    var params = new Array(arguments.length);
    for(var i = 0; i < params.length; ++i) {
        params[i] = arguments[i];
    }
    params.unshift('debug');
    return this.toTarget.apply(this,params);
};
/**
 * Log the arguments at the "debug" level; will only log if the level argument is less than or equal to the current level.
 * @param {Number} level the log event's debug level
 * @param {...*} 
 * @returns {swatk6_logger}
 */
swatk6_logger.prototype.debuglevel = function(level) {
    var params = new Array(arguments.length);
    for(var i = 0; i < params.length; ++i) {
        params[i] = arguments[i];
    }
    level = params.shift();
    if (this.doDebug===false) {
	return this;
    }
    if (this.debugLevel!==-1 && this.debugLevel<level) {
	return this;
    }
    params.unshift('debug');
    return this.toTarget.apply(this,params);
};
/**
 * Log the arguments at the "info" level.
 * @param {...*} 
 * @returns {swatk6_logger}
 */
swatk6_logger.prototype.info = function() {
    var params = new Array(arguments.length);
    for(var i = 0; i < params.length; ++i) {
        params[i] = arguments[i];
    }
    params.unshift('info');
    return this.toTarget.apply(this,params);
};
/**
 * Log the arguments at the "warn" level.
 * @param {...*} 
 * @returns {swatk6_logger}
 */
swatk6_logger.prototype.warn = function() {
    var params = new Array(arguments.length);
    for(var i = 0; i < params.length; ++i) {
        params[i] = arguments[i];
    }
    params.unshift('warn');
    return this.toTarget.apply(this,params);
};
/**
 * Log the arguments at the "error" level.
 * @param {...*} 
 * @returns {swatk6_logger}
 */
swatk6_logger.prototype.error = function() {
    var params = new Array(arguments.length);
    for(var i = 0; i < params.length; ++i) {
        params[i] = arguments[i];
    }
    params.unshift('error');
    return this.toTarget.apply(this,params);
};
/**
 * Log the arguments at the "fatal" level.
 * @param {...*} 
 * @returns {swatk6_logger}
 */
swatk6_logger.prototype.fatal = function() {
    var params = new Array(arguments.length);
    for(var i = 0; i < params.length; ++i) {
        params[i] = arguments[i];
    }
    params.unshift('fatal');
    return this.toTarget.apply(this,params);
};
/**
 * Log the arguments at the "file" level.
 * @param {String} fname filename
 * @param {...*} 
 * @returns {swatk6_logger}
 */
swatk6_logger.prototype.file = function(fname) {
    var params = new Array(arguments.length);
    for(var i = 0; i < params.length; ++i) {
        params[i] = arguments[i];
    }
    params.unshift('file');
    return this.toTarget.apply(this,params);
};

module.exports = swatk6_logger;
