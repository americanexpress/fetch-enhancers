<h1 align="center">
  <img src='https://github.com/americanexpress/fetch-enhancers/blob/master/fetch-enhancers.png' alt="Fetch Enhancers - One Amex" width='50%'/>
</h1>

> A library of middleware for enhancing [Fetch](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API).

## 👩‍💻 Hiring 👨‍💻

Want to get paid for your contributions to `@americanexpress/fetch-enhancers`?
> Send your resume to oneamex.careers@aexp.com

## 📖 Table of Contents

* [Usage](#-useage)
* [Contributing](#-contributing)

## 🤹‍ Usage

* [Installation](#-installation)
* [Fetch Enhancers](#-fetch-enhancers)
* [createTimeoutFetch](#-createTimeoutFetch)
* [createBrowserLikeFetch](#-createBrowserLikeFetch)
* [Composing fetch enhancers](#-composing-fetch-enhancers)
* [Creating your own fetch enhancer](#-creating-your-own-fetch-enhancer)

### Installation

```bash
npm install --save @americanexpress/fetch-enhancers
```

### Fetch Enhancers

Each fetch enhancer follows the same pattern:
* Called with any arguments required for configuration `fetchEnhancer(configuration)`
* Return a function which takes a fetch client as the sole argument  `fetchEnhancer(configuration)(fetch)`


#### createTimeoutFetch [Server & Browser]

`createTimeoutFetch` makes use of the [AbortController](https://developer.mozilla.org/en-US/docs/Web/API/AbortController) to abort requests which exceed the given time limit.


##### Configuring

`createTimeoutFetch` takes a single argument which sets the default timeout.

```js
const enhancedTimeoutFetch = createTimeoutFetch(6e3)(fetch);
```

When called, the enhanced fetch will accept an additional option, `timeout`, allowing for the
default timeout value to be overridden for a single request.

```js
const slowRequest = timeoutFetch('https://example.com/some-slow-api', { timeout: 10e3 });
```

##### Example

```js
import { createTimeoutFetch } from '@americanexpress/fetch-enhancers';

// set your default timeout
const timeoutFetch = createTimeoutFetch(6e3)(fetch);

// Then use timeoutFetch as you would normally
const request = timeoutFetch('https://example.com');
request.then((response) => response.json())
  .then((data) => {
    console.log(data);
  });

// each request can override the default timeout
const fastRequest = timeoutFetch('https://example.com/fast', { timeout: 1e3 });
```

#### createBrowserLikeFetch [Server only]

`createBrowserLikeFetch` is for use on the server only. It enables the forwarding of
cookies and headers from the request made to the host server to trusted outbound requests made during
a server side render. Cookies which are returned are stored for the life of the host servers requests
allowing those cookies to be included, when valid, on subsequent requests.

##### Configuring

`createBrowserLikeFetch` accepts the following named arguments:

###### `headers`

Object containing any headers to be included on fetch requests.

An example of how you could build the headers

```js
const parseHeaders = (req) => ({
  Referer: url.format({
    protocol: req.protocol,
    hostname: req.hostname,
    pathname: req.path,
  }),
  cookie: req.headers.cookie,
});

const headers = parseHeaders(req);
const fetchWithRequestHeaders = createBrowserLikeFetch({
  headers,
  hostname: req.hostname,
  setCookie: res.cookie,
  trustedDomains: [/example\.com/],
})(mockFetch);
```

###### `hostname`

Hostname which should be derived from the Host HTTP header. Used to determine if set `setCookie` will be called. If using Express this can be retrieved from the [`req`](https://expressjs.com/en/4x/api.html#req.hostname) object.

###### `res`

Typically this would be an [Express response](https://expressjs.com/en/4x/api.html#res) object. `createBrowserLikeFetch`
makes use of the [cookie](https://expressjs.com/en/4x/api.html#res.cookie) function to set cookies on the response.

If you wish to provide your own function to set cookies, use [setCookie](#set-cookie).

> `res.cookie()` function provided by express requires [`this`](https://github.com/expressjs/express/blob/master/lib/response.js#L833) to be set
> to the context of the express middleware.

###### `setCookie`

This takes precedence over `res.cookie`.

`setCookie(name, value [, options])`

A callback function invoked when a fetch response contains cookies with a domain which matches to the given hostname.
This can be used to set the cookie on a response object.

`setCookie` is called with the same options as though it's the [Express response cookie](https://expressjs.com/en/4x/api.html#res.cookie) function.
If you are passing in your own setCookie function it is important to note that the `maxAge` option will be in milliseconds.

If desired you can use `setCookie` to add additional checks or modify options passed to `req.cookie`.

```js
const buildStringURIEncodingSetCookie = (res) => (name, value, options) => {
  res.cookie(name, value, { ...options, encode: String });
};

const fetchWithRequestHeaders = createBrowserLikeFetch({
  headers,
  hostname: req.hostname,
  setCookie: (name, value, options) => res.cookie(name, value, {
    ...options, encode: String,
  }),
  trustedDomains: [/example\.com/],
})(mockFetch);
```

###### `trustedDomains`

A list of [regular expressions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions) used to test the path given to fetch when making a request.
If the test is successful the enhanced fetch will include provided cookies.

```js
const trustedDomains = [/api\.example\.com/, /another\.example\.com/];
```

##### Example

```js
const parseHeaders = (req) => ({
  Referer: url.format({
    protocol: req.protocol,
    hostname: req.hostname,
    pathname: req.path,
  }),
  cookie: req.headers.cookie,
  'some-header': req.headers['some-header'] || '1234',
});

const fetchWithRequestHeaders = createBrowserLikeFetch({
  headers: parseHeaders(req),
  hostname: req.hostname,
  setCookie: res.cookie,
  trustedDomains: [/example\.com/],
})(mockFetch);

fetchWithRequestHeaders('https://example.com', {
  credentials: 'include',
});
```

### Composing fetch enhancers

You can chain together multiple enhancers to build a specific enhanced fetch client

```js
import { createTimeoutFetch } from '@americanexpress/fetch-enhancers';
import { yourFetch } from './safeFetch';

const timeoutFetch = createTimeoutFetch(6e3)(fetch);
const myTimeoutFetch = yourFetch(/* options for configuring yourFetch */)(timeoutFetch);

// use the enhanced fetch as you would normally
const response = myTimeoutFetch('https://example.com');
```

You can also use Redux's `compose` function

```js
import { compose } from 'redux';
import { createTimeoutFetch } from '@americanexpress/fetch-enhancers';
import { yourFetch } from './safeFetch';

const enhancedFetch = compose(
  yourFetch(),
  createTimeoutFetch(6e3)
)(fetch);

// Then use the enhanced fetch as you would normally
const request = enhancedFetch('https://example.com');
request.then((response) => response.json())
  .then((data) => {
    console.log(data);
  });
```

### Creating your own fetch enhancer

Each enhancer must return a function which accepts `fetch` as a single argument.

```js
const strictCookieFetch = ({ allowSameOrigin }) => (nextFetch) => {
  (url, arguments_) => nextFetch(url, {
    ...arguments_,
    // use config arg allowSameOrigin
    credentials: allowSameOrigin ? 'same-origin' : 'omit',
  });
};

const safeFetch = strictCookieFetch()(fetch);
```

## 🏆 Contributing

We welcome Your interest in the American Express Open Source Community on Github.
Any Contributor to any Open Source Project managed by the American Express Open
Source Community must accept and sign an Agreement indicating agreement to the
terms below. Except for the rights granted in this Agreement to American Express
and to recipients of software distributed by American Express, You reserve all
right, title, and interest, if any, in and to Your Contributions. Please [fill
out the Agreement](https://cla-assistant.io/americanexpress/fetch-enhancers).

Please feel free to open pull requests and see [CONTRIBUTING.md](./CONTRIBUTING.md) to learn how to get started contributing.

## 🗝️ License

Any contributions made under this project will be governed by the [Apache License
2.0](./LICENSE).

## 🗣️ Code of Conduct

This project adheres to the [American Express Community Guidelines](./CODE_OF_CONDUCT.md).
By participating, you are expected to honor these guidelines.
