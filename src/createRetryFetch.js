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

const defaultMaxRetry = 3;

function defaultBackoffStrategy(retryCount) {
  return new Promise((resolve) => setTimeout(resolve, retryCount * 100));
}

function createRetryFetch(enhancedFetch,
  maxRetry = defaultMaxRetry,
  backoffStrategy = defaultBackoffStrategy) {
  let n = 0;
  return (nextFetch) => (path, options = {}) => {
    const retryFetch = () => enhancedFetch(nextFetch)(path, options)
      .catch((err) => {
        if (n < maxRetry) {
          n += 1;
          return backoffStrategy(n).then(retryFetch);
        }
        throw err;
      });
    return retryFetch();
  };
}

module.exports = createRetryFetch;
