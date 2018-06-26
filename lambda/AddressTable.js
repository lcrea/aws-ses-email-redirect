'use strict';
/** @module AddressTable */


module.exports = class AddressTable {
    /**
     * Data structure to handle the default addresses and the alias table.
     *
     * @example
     * new AddressTable('mydomain.com', 'no-reply', 'me_at_gmail.com', {'info': 'myemail_at_yahoo.com'});
     *
     * @param {string} domain The domain only part of the email address ('mydomain.com') [required]
     * @param {string} from The default mailbox to use as a sender ('no-reply' or 'no-reply_at_mydomain.com') [required]
     * @param {string} to The default email address to redirect ('me_at_gmail.com') [required]
     * @param {(Object.<string, string> | string)} [aliases={}] A table of key-value map of redirect addresses [optional]
     */
    constructor(domain, from, to, aliases={}) {
        /**
         * @private
         * @property {Object.<string, string>} _alias The alias table {mailbox: 'myemail_at_gmail.com'}
         */
        this._alias = this._parseAliases(aliases);

        /**
         * @private
         * @property {string} _from The default mailbox to use as a sender.
         */
        this._from = from;

        /**
         * @property {string} domain The domain only part of the email address.
         */
        this.domain = domain;

        /**
         * @property {string} defaultTo The address to use if not found in alias or if alias is empty.
         */
        this.defaultTo = to;

        // check that any property is defined
        this._checkRequired();
    }

    /**
     * Check that all the properties are defined.
     * @throws {Error} The property is not defined.
     * @returns {undefined}
     */
    _checkRequired() {
        for(let prop of Object.getOwnPropertyNames(this)) {
            if (this[prop] === undefined) {
                throw new Error(`${prop} is not defined`);
            }
        }
    }

    /**
     * Convert a stringified JSON alias table in object
     * @param {(string|Object.<string, string>)} aliases The alias table
     * @returns {Object.<string, string>}
     */
    _parseAliases(aliases) {
        if(typeof(aliases) === 'string') {
            try {
                return JSON.parse(aliases);
            }
            catch(e) {
                return {};
            }
        }
        return aliases;
    }

    /**
     * Get the alias table.
     * @example
     * {
     *   info: 'myemail_at_yahoo.com',
     *   support: 'me_at_gmail.com',
     * }
     *
     * @returns {Object.<string, string>}
     */
    get alias() { return this._alias; }

    /**
     * Get the full from address: mailbox + domain
     * @returns {string} myemail_at_mydomain.com
     */
    get from() {
        if (this._from.indexOf('@') !== -1) {
            return this._from;
        }
        return `${this._from}@${this.domain}`;
    }
};