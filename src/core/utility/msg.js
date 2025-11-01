// msg.js

"use strict";

const msg = Object.freeze({
  nodeEnvNotSet:
    '[env] NODE_ENV not set. Defaulting to "production". Please configure this explicitly.',
  unknownNodeEnv:
    '[env] Unknown NODE_ENV value "{value}". Defaulting to "production".',
  invalidEncryptKeyLength:
    '"ENCRYPT_KEY" environment variable must be defined and be exactly 64 characters long.',
  invalidEncryptKeyFormat:
    '"ENCRYPT_KEY" must be a 64-character hexadecimal string.',
  outMethodMustBeOveridden: `"out" method must be implemented by subclass`,
  abstractClass: `Abstract class cannot be instantiated directly.`,
  invalidConfigParam: `The "config" parameter must be of type "Config" class.`,
  methodMustBeOveridden: `Method must be overridden by subclass.`,
});

export default msg;
