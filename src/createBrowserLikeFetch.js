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

const { CookieJar, parse } = require('tough-cookie');
const deepMerge = require('./deepMergeObjects');

const constructCookieString = (...fragments) => fragments.filter((fragment) => fragment).join('; ');
const isTrustedPath = (path, trustedRegExp) => trustedRegExp.some((t) => new RegExp(t).test(path));

const noop = () => 0;

function createBrowserLikeFetch({
  headers = {},
  hostname,
  res = { cookie: noop },
  setCookie,
  trustedDomains = [],
} = {}) {
  // do not destructure `cookie`. Express req.cookie requires `this` to equal
  // context of express middleware.
  // https://github.com/expressjs/express/blob/master/lib/response.js#L833
  res.cookie = setCookie || res.cookie;

  // jar acts as browser's cookie jar for the life of the SSR
  const jar = new CookieJar();

  return (nextFetch) => (path, options = {}) => {
    let nextFetchOptions = { ...options };

    if (options.credentials && isTrustedPath(path, trustedDomains)) {
      const cookie = constructCookieString(headers.cookie, jar.getCookieStringSync(path));
      nextFetchOptions = deepMerge(
        nextFetchOptions,
        {
          headers: cookie ? { ...headers, cookie } : headers,
        }
      );
    }

    return nextFetch(path, nextFetchOptions)
      .then((fetchedResp) => {
        if (options.credentials && hostname) {
          const cookieStrings = fetchedResp.headers.raw()['set-cookie'] || [];

          cookieStrings.forEach((cookieString) => {
            const cookie = parse(cookieString);
            const { key, value: valueRaw, ...cookieOptions } = cookie;
            try {
              const value = decodeURIComponent(valueRaw);
              const cookieDomain = cookieOptions.domain;
              if (cookieDomain && `.${cookieDomain}`.endsWith(`.${hostname.split('.').slice(-2).join('.')}`)) {
                const expressCookieOptions = {
                  ...cookieOptions,
                  ...cookieOptions.maxAge ? { maxAge: cookieOptions.maxAge * 1e3 } : undefined,
                };
                res.cookie(key, value, expressCookieOptions);
              }
              jar.setCookieSync(cookie, path);
            } catch (error) {
              // eslint-disable-next-line no-console
              console.warn(`Warning: failed to set cookie "${key}" from path "${path}" with the following error, "${error.message}"`);
            }
          });
        }
        return fetchedResp;
      });
  };
}

module.exports = createBrowserLikeFetch;
