const phantomjs = require('phantomjs-prebuilt');
const webdriverio = require('webdriverio');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

const wdOpts = { desiredCapabilities: { browserName: 'phantomjs' } }

module.exports = {
  run,
};

function run(options, callback) {
  const { kaistId, kaistPassword } = options;
  let { size } = options;
  if (!size) {
    size = 10;
  }
  phantomjs.run('--webdriver=4444').then(program => {
    webdriverio.remote(wdOpts).init()
      .url('https://iam.kaist.ac.kr/iamps/mobileLogin.do')
      .waitForExist('#id')
      .waitForExist('#password')
      .setValue('#id', kaistId)
      .setValue('#password', kaistPassword)
      .click('.marg_bt22>a')
      .url('https://portal.kaist.ac.kr/index.html')
      .url(`https://portal.kaist.ac.kr/board/list.brd?boardId=today_notice&pageSize=${size}`)
      .getHTML('html').then(html => {
        processNoticePage(html, callback);
        program.kill();
      });
  });
}

function processNoticePage(html, callback) {
  const { document } = new JSDOM(html).window;
  const elements = document.querySelectorAll('.req_tit>a');
  const notices = [];
  elements.forEach(e => {
    notices.push({
      title: e.text.trim(),
      link: 'https://portal.kaist.ac.kr' + e.href,
    });
  });
  callback(null, notices);
}
