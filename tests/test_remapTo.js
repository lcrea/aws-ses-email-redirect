'use strict';

const remapTo = require('../lambda/remapTo');
const AddressTable = require('../lambda/AddressTable');

// Default values for the tests
const defaultFrom = 'no-reply';
const defaultTo = 'me@gmail.com';
const myDomain = 'mydomain.com';
const aliases = {
    'info': 'boss@yahoo.com',
    'it-team': 'you@gmail.com',
    'support': 'help@hotmail.com',
};


describe('Single destination:', () => {
    test('should choose one alias', () => {
        const address = new AddressTable(myDomain, defaultFrom, defaultTo, aliases);
        const mailbox = Object.getOwnPropertyNames(aliases)[1];
        const finalTo = remapTo([`${mailbox}@${myDomain}`], address);
        expect(finalTo).toEqual([aliases[mailbox]]);
    });

    test('if not in alias table => default address', () => {
        const address = new AddressTable(myDomain, defaultFrom, defaultTo, aliases);
        const finalTo = remapTo([`not-in-alias-table@${myDomain}`], address);
        expect(finalTo).toEqual([defaultTo]);
    });

    test('empty alias table => default address', () => {
        const address = new AddressTable(myDomain, defaultFrom, defaultTo);
        const finalTo = remapTo([`not-in-alias-table@${myDomain}`], address);
        expect(finalTo).toEqual([defaultTo]);
    });

    test('empty source list => default address', () => {
        const address = new AddressTable(myDomain, defaultFrom, defaultTo, aliases);
        const finalTo = remapTo([], address);
        expect(finalTo).toEqual([defaultTo]);
    });
});


describe('Multiple destinations:', () => {
    test('should be able to use all the aliases', () => {
        const address = new AddressTable(myDomain, defaultFrom, defaultTo, aliases);
        const sourceTo = Object
                            .keys(aliases)
                            .map(mailbox => `${mailbox}@${myDomain}`);
        const finalTo = remapTo(sourceTo, address);
        expect(finalTo).toHaveLength(Object.values(aliases).length);
        expect(finalTo).toEqual(
            expect.arrayContaining(Object.values(aliases)),
        );
    });

    test('should exclude external domains even with same mailboxes as in alias table', () => {
        const address = new AddressTable(myDomain, defaultFrom, defaultTo, aliases);
        const sourceTo = [
            `info@${myDomain}`,
            `it-team@${myDomain}`,

            `info@unknown.com`,
            `it-team@fakedomain.com`,

            'user-1@unknown.com',
            'user-2@different.com',
            'user-3@not-existent.com',
        ];
        const finalTo = remapTo(sourceTo, address);
        const expectedResult = [
            aliases['info'],
            aliases['it-team'],
        ];
        expect(finalTo).toHaveLength(expectedResult.length);
        expect(finalTo).toEqual(
            expect.arrayContaining(expectedResult),
        );
    });

    test('if not in alias table => default address', () => {
        const address = new AddressTable(myDomain, defaultFrom, defaultTo);
        const sourceTo = [
            `none@${myDomain}`,
            'user-1@unknown.com',
            'user-2@different.com',
            'user-3@not-existent.com',
        ];
        const finalTo = remapTo(sourceTo, address);
        expect(finalTo).toEqual([defaultTo]);
    });
});


describe('Borderline addresses', () => {
    test.each([
        [`"Double Quotes Name" <double-quotes@${myDomain}>`, 'double-quotes'],
        [`'Single Quotes Name' <single-quotes@${myDomain}>`, 'single-quotes'],
        [`Name Without Quotes But With Spaces <no-quotes-with-spaces@${myDomain}>`, 'no-quotes-with-spaces'],
        [`"email-as-name@${myDomain}" <email-as-name@${myDomain}>`, 'email-as-name'],
        [`<pureaddress-with-openclose-symbols@${myDomain}>`, 'pureaddress-with-openclose-symbols'],
        [`pureaddress@${myDomain}`, 'pureaddress'],
        [`=?utf-8?B?dXRmOCBiYXNlNjQg4GNjZW506GQgbuBt6Q==?= <utf8-base64@${myDomain}>`, 'utf8-base64'],
        [`=?utf-8?Q?utf8=20quoted-printable=20=C3=A0ccent=C3=A8d=20n=C3=A0m=C3=A9?= <utf8-quoted-printable@${myDomain}>`, 'utf8-quoted-printable'],
    ])('%s', (sourceTo, mailbox) => {
        const address = new AddressTable(myDomain, defaultFrom, defaultTo, { [mailbox]: 'hello@gmail.com' });
        const finalTo = remapTo([sourceTo], address);
        expect(finalTo).toEqual([address.alias[mailbox]]);
    });
});