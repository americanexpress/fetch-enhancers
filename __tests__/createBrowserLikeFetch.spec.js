/*
 * Copyright 2020 American Express Travel Related Services Company, Inc
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 * or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */

const { Headers } = require('node-fetch');
const createBrowserLikeFetch = require('../src/createBrowserLikeFetch');

describe('createCookiePassingFetch', () => {
  it('correctly calls setCookie when hostname matches cookie domain on response', async () => {
    const mockFetch = jest.fn(() => Promise.resolve({
      headers: new Headers({
        'set-cookie': [
          'sessionid=123456; Secure; HttpOnly; domain=example.com; Max-Age=3600',
        ],
      }),
    }));
    const hostname = 'api.example.com';
    const setCookie = jest.fn();
    const fetchWithRequestHeaders = createBrowserLikeFetch({
      hostname,
      setCookie,
    })(mockFetch);

    await fetchWithRequestHeaders('https://example.com', {
      credentials: 'include',
    });

    expect(setCookie.mock.calls[0][0]).toEqual('sessionid');
    expect(setCookie.mock.calls[0][1]).toEqual('123456');
    expect(setCookie.mock.calls[0][2].domain).toEqual('example.com');
    expect(setCookie.mock.calls[0][2].httpOnly).toBeTruthy();
    expect(setCookie.mock.calls[0][2].secure).toBeTruthy();
    // express sets cookies max age in milliseconds rather than seconds
    expect(setCookie.mock.calls[0][2].maxAge).toEqual(3600000);
  });

  it('does not call setCookie with mismatching domain on response', async () => {
    const mockFetch = jest.fn(() => Promise.resolve({
      headers: new Headers({
        'set-cookie': [
          'sessionid=123456; Secure; HttpOnly; domain=not-matching-domain.example.org',
        ],
      }),
    }));
    const hostname = 'example.com';
    const setCookie = jest.fn();

    const fetchWithRequestHeaders = createBrowserLikeFetch({
      hostname,
      setCookie,
    })(mockFetch);

    await fetchWithRequestHeaders('https://example.com', {
      credentials: 'include',
    });

    expect(setCookie).not.toHaveBeenCalled();
  });

  it('sends cookies from headers to fetch requests when credentials included and path is a trustedDomain', () => {
    const mockFetch = jest.fn(() => Promise.resolve({}));
    const headers = {
      cookie: 'sessionid=123456',
    };
    const trustedDomains = [/^https:\/\/safe-to-send\.example\.net\/api\/.+$/];
    const enhancedFetch = createBrowserLikeFetch({ trustedDomains, headers })(mockFetch);

    enhancedFetch('https://safe-to-send.example.net/api/some-resource', {
      credentials: 'include',
      headers: {
        'Custom-Header': 'some header for this request',
      },
    });

    expect(mockFetch).toHaveBeenCalledWith('https://safe-to-send.example.net/api/some-resource', {
      credentials: 'include',
      headers: {
        cookie: 'sessionid=123456',
        'Custom-Header': 'some header for this request',
      },
    });
  });

  it('does not send cookies from headers to fetch requests when credentials included and path is not a trustedDomain', () => {
    const mockFetch = jest.fn(() => Promise.resolve({}));
    const headers = {
      cookie: 'sessionid=123456',
    };
    const trustedDomains = [/^https:\/\/safe-to-send\.example\.net\/api\/.+$/];
    const enhancedFetch = createBrowserLikeFetch({ trustedDomains, headers })(mockFetch);

    enhancedFetch('https://not-safe-to-send.example.net/api/some-resource', {
      credentials: 'include',
      headers: {
        'Custom-Header': 'some header for this request',
      },
    });

    expect(mockFetch).toHaveBeenCalledWith('https://not-safe-to-send.example.net/api/some-resource', {
      credentials: 'include',
      headers: {
        'Custom-Header': 'some header for this request',
      },
    });
  });

  it('does not send cookies from headers to fetch requests when credentials not included but path is a trustedDomain', () => {
    const mockFetch = jest.fn(() => Promise.resolve({}));
    const headers = {
      cookie: 'sessionid=123456',
    };
    const trustedDomains = [/^https:\/\/safe-to-send\.example\.com\/api\/.+$/];
    const enhancedFetch = createBrowserLikeFetch({ trustedDomains, headers })(mockFetch);

    enhancedFetch('https://safe-to-send.example.com/api/some-resource', {
      headers: {
        'Custom-Header': 'some header for this request',
      },
    });

    expect(mockFetch).toHaveBeenCalledWith('https://safe-to-send.example.com/api/some-resource', {
      headers: {
        'Custom-Header': 'some header for this request',
      },
    });
  });

  it('sends along cookies that were set by a previous request', async () => {
    const mockFetch = jest.fn((path) => {
      switch (path) {
        case 'https://example.com/api/a': {
          const headers = new Headers({
            'set-cookie': [
              'safeid=a3fWa; Secure; HttpOnly; domain=example.com',
            ],
          });
          return Promise.resolve({ headers });
        }
        default: {
          return Promise.resolve({ headers: new Headers({}) });
        }
      }
    });

    const hostname = 'example.org';
    const headers = {
      cookie: 'someid=abc',
    };
    const setCookie = jest.fn();
    const trustedDomains = [/.*/];

    const enhancedFetch = createBrowserLikeFetch({
      hostname, headers, trustedDomains, setCookie,
    })(mockFetch);
    await enhancedFetch('https://example.com/api/a', { credentials: 'include' });
    await enhancedFetch('https://example.com/api/b', { credentials: 'include' });

    expect(setCookie).not.toHaveBeenCalled();
    expect(mockFetch).toHaveBeenCalledWith('https://example.com/api/a', {
      credentials: 'include',
      headers: {
        cookie: 'someid=abc',
      },
    });

    expect(mockFetch).toHaveBeenCalledWith('https://example.com/api/b', {
      credentials: 'include',
      headers: {
        cookie: 'someid=abc; safeid=a3fWa',
      },
    });
  });

  it('should catch, log, and still resolve if a cookie was not able to be set', async () => {
    const RealConsole = console;
    const warn = jest.fn();
    const mockedConsole = { warn };
    global.console = mockedConsole;

    const invalidDomain = 'example.net';
    const headers = new Headers({
      'set-cookie': [
        `id=a3fWa; Domain=${invalidDomain}`,
      ],
    });
    const response = { headers };
    const mockFetch = jest.fn(() => Promise.resolve(response));
    const setCookie = jest.fn();
    const hostname = 'example.com';

    const enhancedFetch = createBrowserLikeFetch({ hostname, setCookie })(mockFetch);

    await expect(enhancedFetch('https://some-domain.example.com/api/some-resource', { credentials: 'include' }))
      .resolves.toBe(response);
    expect(setCookie).not.toHaveBeenCalled();
    expect(warn.mock.calls[0][0])
      .toBe(`Warning: failed to set cookie "id" from path "https://some-domain.example.com/api/some-resource" with the following error, "Cookie not in this host's domain. Cookie:${invalidDomain} Request:some-domain.example.com"`);

    global.console = RealConsole;
  });

  it('does not send an empty string cookie header', async () => {
    const mockFetch = jest.fn(() => Promise.resolve({ headers: new Headers({}) }));
    const hostname = 'example.com';
    const trustedDomains = [/.*/];
    const enhancedFetch = createBrowserLikeFetch({ hostname, trustedDomains })(mockFetch);

    await enhancedFetch('/', { credentials: 'include' });
    expect(mockFetch).toHaveBeenCalledWith('/', {
      credentials: 'include',
      headers: {},
    });
  });

  it('handles when there are no set-cookie headers', async () => {
    const headers = new Headers({});
    const mockFetch = jest.fn(() => Promise.resolve({ headers }));
    const hostname = 'example.com';
    const setCookie = jest.fn();

    const enhancedFetch = createBrowserLikeFetch({ hostname, setCookie })(mockFetch);
    await enhancedFetch('/api/some-resource', { credentials: 'include', someOpt: 'someValue' });
    expect(mockFetch).toHaveBeenCalledWith('/api/some-resource', { credentials: 'include', someOpt: 'someValue' });
    expect(setCookie).not.toHaveBeenCalled();
  });

  it('deserializes cookies from API calls', async () => {
    const headers = new Headers({
      'set-cookie': [
        'serialized=hello%3Aworld%25%F0%9F%8C%8D; Secure; HttpOnly; Domain=example.com',
      ],
    });
    const response = { headers };
    const mockFetch = jest.fn(() => Promise.resolve(response));
    const setCookie = jest.fn();
    const hostname = 'hello.example.com';

    const enhancedFetch = createBrowserLikeFetch({ hostname, setCookie })(mockFetch);
    await enhancedFetch('https://example.org/api/some-resource', { credentials: 'include' });

    expect(setCookie.mock.calls[0][0]).toEqual('serialized');
    expect(setCookie.mock.calls[0][1]).toEqual('hello:world%🌍');
    expect(setCookie.mock.calls[0][2].domain).toEqual('example.com');
    expect(setCookie.mock.calls[0][2].httpOnly).toBeTruthy();
    expect(setCookie.mock.calls[0][2].secure).toBeTruthy();
  });

  it('uses default opts', async () => {
    const mockFetch = jest.fn(() => Promise.resolve());
    const enhancedFetch = createBrowserLikeFetch()(mockFetch);
    await enhancedFetch('https://example.org/api/some-resource');
    expect(mockFetch).toHaveBeenCalledWith('https://example.org/api/some-resource', {});
  });

  it('does not add headers to fetch when not a trustedDomain', async () => {
    const mockFetch = jest.fn(() => Promise.resolve({
      headers: new Headers({
        'set-cookie': [
          'safeid=a3fWa; Secure; HttpOnly; domain=example.com',
        ],
      }),
    }));
    const hostname = 'example.com';
    const headers = {
      'one-custom-header': 'i-did-not-make-it',
    };
    const trustedDomains = [];

    const enhancedFetch = createBrowserLikeFetch({
      headers, trustedDomains, hostname,
    })(mockFetch);

    await enhancedFetch('not-trusted.example.com', { credentials: 'include' });
    expect(mockFetch).toHaveBeenCalledWith('not-trusted.example.com', {
      credentials: 'include',
    });
  });

  it('adds all headers to fetch when a trustedDomain', async () => {
    const mockFetch = jest.fn(() => Promise.resolve({
      headers: new Headers({
        'set-cookie': [
          'safeid=a3fWa; Secure; HttpOnly; domain=example.com',
        ],
      }),
    }));
    const hostname = 'example.com';
    const headers = {
      'one-custom-header': 'hello-there',
    };
    const trustedDomains = [/.*/];
    const enhancedFetch = createBrowserLikeFetch({
      headers, trustedDomains, hostname,
    })(mockFetch);

    await enhancedFetch('some.example.com', { credentials: 'include' });
    expect(mockFetch).toHaveBeenCalledWith('some.example.com', {
      credentials: 'include',
      headers: {
        'one-custom-header': 'hello-there',
      },
    });
  });

  it('uses res.cookie to set cookie', async () => {
    const mockFetch = jest.fn(() => Promise.resolve({
      headers: new Headers({
        'set-cookie': [
          'sessionid=123456; Secure; HttpOnly; domain=example.com; Max-Age=3600',
        ],
      }),
    }));
    const hostname = 'api.example.com';
    const setCookie = jest.fn();
    const fetchWithRequestHeaders = createBrowserLikeFetch({
      hostname,
      res: { cookie: setCookie },
    })(mockFetch);

    await fetchWithRequestHeaders('https://example.com', {
      credentials: 'include',
    });

    expect(setCookie.mock.calls[0][0]).toEqual('sessionid');
    expect(setCookie.mock.calls[0][1]).toEqual('123456');
    expect(setCookie.mock.calls[0][2].domain).toEqual('example.com');
    expect(setCookie.mock.calls[0][2].httpOnly).toBeTruthy();
    expect(setCookie.mock.calls[0][2].secure).toBeTruthy();
  });

  it('setCookie overrides res.cookie', async () => {
    const mockFetch = jest.fn(() => Promise.resolve({
      headers: new Headers({
        'set-cookie': [
          'sessionid=123456; Secure; HttpOnly; domain=example.com; Max-Age=3600',
        ],
      }),
    }));
    const hostname = 'api.example.com';
    const expressCookie = jest.fn();
    const setCookie = jest.fn();
    const fetchWithRequestHeaders = createBrowserLikeFetch({
      hostname,
      res: { cookie: expressCookie },
      setCookie,
    })(mockFetch);

    await fetchWithRequestHeaders('https://example.com', {
      credentials: 'include',
    });
    expect(expressCookie).not.toHaveBeenCalled();
    expect(setCookie.mock.calls[0][0]).toEqual('sessionid');
    expect(setCookie.mock.calls[0][1]).toEqual('123456');
    expect(setCookie.mock.calls[0][2].domain).toEqual('example.com');
    expect(setCookie.mock.calls[0][2].httpOnly).toBeTruthy();
    expect(setCookie.mock.calls[0][2].secure).toBeTruthy();
  });
});
