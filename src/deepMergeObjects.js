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

const merge = (sourceObject, mergeObject) => {
  const mergedSourceObject = sourceObject;
  Object.keys(mergeObject).forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(sourceObject, key)
                  && typeof sourceObject[key] === 'object'
                  && !Array.isArray(sourceObject[key])) {
      merge(mergedSourceObject[key], mergeObject[key]);
    } else {
      mergedSourceObject[key] = mergeObject[key];
    }
  });
  return sourceObject;
};

const deepMergeObjects = (baseObject, ...objs) => {
  objs.forEach((mergeObject) => merge(baseObject, mergeObject));
  return baseObject;
};

export default deepMergeObjects;
