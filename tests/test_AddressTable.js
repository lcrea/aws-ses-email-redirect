'use strict';

const AddressTable = require('../lambda/AddressTable');

// Default values for the tests
const domain = 'mydomain.com';
const defaultTo =  'me@gmail.com';
const defaultFrom = 'no-reply';
const aliases = {
    'info': 'boss@yahoo.com',
    'it-team': 'you@gmail.com',
    'support': 'help@hotmail.com',
};


describe('General:', () => {
    test.each([
        'domain',
        'alias',
        'defaultTo',
        'from',
    ])('should have property: %s', (prop) => {
        expect(new AddressTable(domain, defaultFrom, defaultTo, aliases)).toHaveProperty(prop);
    });

    test.each([
        ['domain', [undefined, '', '', {}]],
        ['defaultTo', ['', undefined, '', {}]],
        ['from', ['', '', undefined, {}]],
    ])('if %s property is not defined => Error', (prop, args) => {
        expect(() => new AddressTable(...args)).toThrowError();
    });
});


describe('Alias property:', () => {
    test('can be undefined', () => {
        const address = new AddressTable(domain, defaultFrom, defaultTo);
        expect(address.alias).toEqual({});
    });
    test('can be an Object', () => {
        const address = new AddressTable(domain, defaultFrom, defaultTo, aliases);
        expect(address.alias).toEqual(aliases);
    });
    test('can be a JSON String', () => {
        const aliasesAsString = JSON.stringify(aliases);
        const address = new AddressTable(domain, defaultFrom, defaultTo, aliasesAsString);
        expect(address.alias).toEqual(aliases);
    });
    test('can be an empty String', () => {
        const address = new AddressTable(domain, defaultFrom, defaultTo, '');
        expect(address.alias).toEqual({});
    });
});


describe('From property:', () => {
    test(`can be a mailbox only (${defaultFrom})`, () => {
        const address = new AddressTable(domain, defaultFrom, defaultTo);
        expect(address.from).toBe(`${defaultFrom}@${domain}`);
    });
    test(`can be a full address (${defaultFrom}@${domain})`, () => {
        const fullFrom = `${defaultFrom}@${domain}`;
        const address = new AddressTable(domain, fullFrom, defaultTo);
        expect(address.from).toBe(fullFrom);
    });
});