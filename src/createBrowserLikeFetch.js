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

const { CookieJar, parse, getPublicSuffix } = require('tough-cookie');
const deepMerge = require('./deepMergeObjects');

const constructCookieString = (...fragments) => fragments.filter((fragment) => fragment).join('; ');
const isTrustedURL = (path, trustedRegExp) => trustedRegExp.some((t) => new RegExp(t).test(path));

const noop = () => 0;

function createBrowserLikeFetch({
  headers = {},
  hostname,
  res = { cookie: noop },
  setCookie,
  trustedURLs = [],
  trustedDomains,
} = {}) {
  // do not destructure `cookie`. Express req.cookie requires `this` to equal
  // context of express middleware.
  // https://github.com/expressjs/express/blob/master/lib/response.js#L833
  res.cookie = setCookie || res.cookie;

  // trustedDomains is deprecated for matching URLs instead of just domains
  // remove in the next major/breaking version
  if (trustedDomains) {
    // notify the user of the deprecation
    // eslint-disable-next-line no-console
    console.warn('createBrowserLikeFetch: trustedDomains option is deprecated in favor of trustedURLs, adding entries to trustedURLs');
    // avoid mutation of the parameter (ex: `trustedURLs.push(...trustedDomains)`)
    // eslint-disable-next-line no-param-reassign
    trustedURLs = [...trustedURLs, ...trustedDomains];
  }

  // jar acts as browser's cookie jar for the life of the SSR
  const jar = new CookieJar();

  const dottedHostnamePublicSuffix = hostname && `.${getPublicSuffix(hostname)}`;

  return (nextFetch) => (url, options = {}) => {
    let nextFetchOptions = { ...options };

    if (options.credentials && isTrustedURL(url, trustedURLs)) {
      const cookie = constructCookieString(headers.cookie, jar.getCookieStringSync(url));
      nextFetchOptions = deepMerge(
        nextFetchOptions,
        {
          headers: cookie ? { ...headers, cookie } : headers,
        }
      );
    }

    return nextFetch(url, nextFetchOptions)
      .then((fetchedResp) => {
        if (options.credentials && hostname) {
          const cookieStrings = fetchedResp.headers.raw()['set-cookie'] || [];

          cookieStrings.forEach((cookieString) => {
            const cookie = parse(cookieString);
            const { key, value: valueRaw, ...cookieOptions } = cookie.toJSON();
            // first run tough-cookie's rules when adding the cookie to the jar
            // if this throws then the cookie is not valid for the configured hostname either
            try {
              jar.setCookieSync(cookie, url);
            } catch (error) {
              // eslint-disable-next-line no-console
              console.warn(`Warning: failed to set cookie "${key}" from path "${url}" with the following error, "${error.message}"`);
              return;
            }

            // then check if this cookie relates to this hostname
            const cookieDomain = cookieOptions.domain;
            if (!(cookieDomain && `.${cookieDomain}`.endsWith(dottedHostnamePublicSuffix))) {
              return;
            }

            // valid cookie that relates to this hostname, add it to the response cookies set
            const value = decodeURIComponent(valueRaw);
            const expressCookieOptions = {
              ...cookieOptions,
              ...cookieOptions.maxAge ? { maxAge: cookieOptions.maxAge * 1e3 } : undefined,
            };
            res.cookie(key, value, expressCookieOptions);
          });
        }
        return fetchedResp;
      });
  };
}

module.exports = createBrowserLikeFetch;
