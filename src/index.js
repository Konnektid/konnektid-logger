/**
 * Konnektid2 - konnektid-logger
 *
 * Copyright(c) 2016 Konnektid
 * All rights reserved.
 *
 * @author Simone Potenza
 */
"use strict";

// Module dependencies
import path from "path";
import util from "util";

/**
 * [Logger description]
 */
function Logger() {

    // the context
    const self = this;

    /**
     * The logger for the debug and info and worning
     */
    this._logger = process.stdout;

    /**
     * The logger for error exceptions
     */
    this._errorLogger = process.stderr;

    /**
     * NoOp
     */
    const noop = () => {};

    /**
     * Returns whether the current log level matches the level required
     * e.g.:
     *
     *      if (logLevel("A")) console.log("verbose log");
     *      if (logLevel("E")) console.log("error");
     *
     * Will not print "verbose log" when the log level is lower than A (either E or W)
     *
     * @param {string}          level           The log level needed, either A, W or E
     *
     * @returns {boolean}                         Whether the current log level is sufficient
     */
    function logLevel(level) {

        const required = level.toUpperCase();
        const current = process.env.LOG_LEVEL || "A";

        if (current === "A") return required === "E" || required === "W" || required === "A";
        if (current === "W") return required === "E" || required === "W";
        if (current === "E") return required === "E";
    }

    /**
     * Get the timestamp to prefix log messages with
     * @returns {string} timestamp as a string
     */
    function getTimestamp() {
        return `\x1b[1;30m${(new Date()).toISOString()}\x1b[0m `;
    }

    /**
     * Get the stack from the file that called it.
     *
     * @returns {Array} Returns the stack array without the last two elements
     */
    function getStack() {

        // let's override the V8 function to format the stack trace
        Error.originalStackTrace = Error.prepareStackTrace;
        Error.prepareStackTrace = function (err, stack) {
            return stack;
        };

        // let's get the stack
        const stackArray = (new Error()).stack;

        // put back the stacktrace
        Error.prepareStackTrace = Error.originalStackTrace;

        // return the stack without considering the last two elements
        return stackArray.slice(1);
    }

    /**
     * Gets the file name and line of the file
     *
     * @returns {String} The filename and the line number concatenated
     */
    function filename() {

        // Get trace info
        const trace = getStack()[2];

        // return the token
        return `${path.basename(trace.getFileName())}:${trace.getLineNumber()}`;
    }

   /**
    * Joins the list of arguments together
    * @param  {array} args an array of arguments
    * @returns {[type]}      a string containing each element of the list of arguments
    */
    function parseValues(args) {

        for (let i = 0; i < args.length; i++) {

            if (args[i] instanceof Error) args[i] = args[i].stack || args[i];

            else if (typeof args[i] === "object") args[i] = util.inspect(args[i]);

            else if (args[i] === undefined) args[i] = "undefined";
        }

        return args.join(" ");
    }

    /**
     * Print a string in debug mode. Debug mode shows the line number and file of the call invocation.
     *
     * @param {*}  value       the value to print in debug
     */
    this.debug = logLevel("A") ? function (...rest) {

        const value = parseValues(Array.prototype.slice.call(rest));

        self._logger.write(`${getTimestamp()}\x1b[36m==> [${filename()}]\x1b[0m ${value}\n`);
    } : noop;

    /**
     * Prints the stack trace
     *
     * @param message
     */
    this.trace = logLevel("A") ? function (message) {

        // build the stack trace to print
        const res = (message || "Debug Trace") + "\x1b[0m" + getStack().slice(1).reduce((res, s) => {
            return `${res}\n  at ${s.getFunctionName()} (${s.getFileName()}:${s.getLineNumber()}:${s.getColumnNumber()})`;
        }, "");

        // let's print the result
        self._logger.write(`${getTimestamp()}\x1b[36m==> ${res} \n`);
    } : noop;

    /**
     * Prints a log
     *
     * @param {*}  value       the value to print in info
     */
    this.log = logLevel("A") ? function (...rest) {
        self._logger.write(`${getTimestamp()}    ${parseValues(Array.prototype.slice.call(rest))}\n`);
    } : noop;

    /**
     * Prints a inf message
     *
     * @param {*}  value       the value to print in warning
     */
    this.info = logLevel("A") ? function (...rest) {
        self._logger.write(`${getTimestamp()}\x1b[32m i \x1b[0m ${parseValues(Array.prototype.slice.call(rest))}\n`);
    } : noop;

    /**
     * Prints a warning
     *
     * @param {*}  value       the value to print in warning
     */
    this.warn = logLevel("W") ? function (...rest) {
        self._logger.write(`${getTimestamp()}\x1b[33m[!]\x1b[0m ${parseValues(Array.prototype.slice.call(rest))}\n`);
    } : noop;

    /**
     * Prints an error
     *
     * @param {Error}  value       the value to print in error
     */
    this.error = logLevel("E") ? function (...rest) {
        self._errorLogger.write(`${getTimestamp()}\x1b[31mERR\x1b[0m ${parseValues(Array.prototype.slice.call(rest))}\n`);
    } : noop;

    // override console object
    (function (c) {

        c.debug = self.debug;
        c.trace = self.trace;
        c.log = self.log;
        c.info = self.info;
        c.warn = self.warn;
        c.error = self.error;

    })(console);
}

const logger = new Logger();

// exports the logger
module.exports = logger;
