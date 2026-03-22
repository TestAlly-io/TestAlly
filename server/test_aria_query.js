const { dom } = require('aria-query');

const divRoles = dom.get('div');
const spanRoles = dom.get('span');
const buttonRoles = dom.get('button');

console.log('div:', divRoles);
console.log('span:', spanRoles);
console.log('button:', buttonRoles);

const generics = [];
for (const [el, roles] of dom.entries()) {
  if (!roles || roles.length === 0 || roles.some(r => r.name === 'generic' || r.name === 'presentation' || r.name === 'none')) {
    generics.push(el.name);
  }
}

console.log('Detected generics:', generics.join(', '));
