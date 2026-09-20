import type { Directive, DirectiveBinding } from 'vue';

import { masker } from './masker';
import { tokens } from './tokens';

const event = (name: string): Event => {
  return new CustomEvent(name, {
    bubbles: true,
    cancelable: true,
    composed: true,
  });
};

export const useMask: Directive = (el: HTMLInputElement, binding: DirectiveBinding) => {
  if (!binding.value) {return;}
  let config = binding.value;
  if (Array.isArray(config) || 'string' === typeof config) {
    config = {
      mask: config,
      tokens,
    };
  }

  if ('INPUT' !== el.tagName.toLocaleUpperCase()) {
    const els = el.getElementsByTagName('input');
    if (1 !== els.length) {
      throw new Error(`v-mask directive requires 1 input, found ${els.length}`);
    } else {
      el = els[0];
    }
  }

  el.oninput = function  oninput(evt) {
    if (!evt.isTrusted) {return;}
    let position: number = el.selectionEnd || 0;
    const digit = el.value[position - 1];
    el.value = masker(el.value, config.mask, config.tokens, true);
    while (position < el.value.length && el.value.charAt(position - 1) !== digit) {
      position++;
    }
    if (el === document.activeElement) {
      el.setSelectionRange(position, position);
      setTimeout(function () {
        el.setSelectionRange(position, position);
      }, 0);
    }
    el.dispatchEvent(event('input'));
  };

  const newDisplay = masker(el.value, config.mask, config.tokens, true);
  if (newDisplay !== el.value) {
    el.value = newDisplay;
    el.dispatchEvent(event('input'));
  }
};
