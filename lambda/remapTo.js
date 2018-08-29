'use strict';
/** @module remapTo */

/**
 * Selects the email addresses to use and remaps them based on a given alias table.
 *
 * @example
 * const sourceTo = ['info_at_mydomain.com'];
 * const address = new AddressTable('mydomain.com', 'default-from', 'default-to_at_gmail.com', {'info': 'me_at_yahoo.com'})
 * remapTo(sourceTo, address);  // Returns ['me_at_yahoo.com']
 *
 * @param {String[]} sourceTo Original list of email addresses.
 * @param {AddressTable} address An AddressTable instance.
 *
 * @returns {String[]} List of email addresses to which forward the original message.
 */
module.exports = (sourceTo, address) => {
    /*
     * Useful regex
     *
     * - To separate name (optional) from email (mandatory):
     *   /^From:\ +(?<name>.*(?=\s+<))?\W*(?<email>[^>|\s]+).*$/
     *
     * - To separate only the name (optional):
     *   /^"?(?<name>[^"<@]*?(?="?\s<))/
     */

    // Splits an email address in: [user mailbox] | [domain]
    const regexMailbox = /^(.*(?=<)<)?(.+(?=@))@(.+(?=\b))/;
    const emailTo = [];

    sourceTo.forEach(val => {
        const mailbox = regexMailbox.exec(val)[2];
        const domain = regexMailbox.exec(val)[3];

        if (domain == address.domain) {
            mailbox in address.alias
            ?
            emailTo.push(address.alias[mailbox])
            :
            emailTo.push(address.defaultTo);
        }
    });

    return emailTo.length ? emailTo : [ address.defaultTo ];
};
