function isObject(obj) {
  return obj !== null && typeof obj === 'object';
}

function isPlainObject(obj) {
  return isObject(obj) && (
          obj.constructor === Object  // obj = {}
          || obj.constructor === undefined // obj = Object.create(null)
        );
}

function mergeDeep(target, ...sources) {
  if (!sources.length) { return target; }
  const source = sources.shift();

  if(Array.isArray(target)) {
    if(Array.isArray(source)) {
      target.push(...source);
    } else {
      target.push(source);
    }
  } else if(isPlainObject(target)) {
    if(isPlainObject(source)) {
      for(let key of Object.keys(source)) {
        if(!target[key]) {
          target[key] = source[key];
        } else {
          mergeDeep(target[key], source[key]);
        }
      }
    } else {
      throw new Error(`Cannot merge object with non-object`);
    }
  } else {
    target = source;
  }

  return mergeDeep(target, ...sources);
};

module.exports = mergeDeep;
