const { JSDOM } = require('jsdom');
JSDOM.fromURL("http://localhost:8080/", {
  runScripts: "dangerously",
  resources: "usable"
}).then(dom => {
  const window = dom.window;
  window.console.log = (...args) => console.log('LOG:', ...args);
  window.console.error = (...args) => console.log('ERROR:', ...args);
  window.console.warn = (...args) => console.log('WARN:', ...args);
  window.addEventListener('error', event => {
    console.log('UNCAUGHT ERROR:', event.error);
  });
  window.addEventListener('unhandledrejection', event => {
    console.log('UNHANDLED REJECTION:', event.reason);
  });
  setTimeout(() => {
    console.log('DONE WAITING. BODY HTML:', window.document.body.innerHTML.substring(0, 100));
    process.exit(0);
  }, 2000);
}).catch(err => console.error('FAILED TO LOAD:', err));
