//Icon hover text
const TITLE_APPLY = "Enable Darkmode";
const TITLE_REMOVE = "Disable Darkmode";

//CSS location
const CSS_PATH = "css/lambda-dark.css";

//Singleton for extension state (enabled/disabled)
const state = (function () {
  let iState = false;

  return {
    save(newState) {
      chrome.storage.local.set({
        'isEnabled': newState
      });
      iState = newState;
      console.log(`New state saved: ${newState}`);
    },

    load() {
      chrome.storage.local.get('isEnabled', data => {
        iState = data.isEnabled;
        console.log(`Loaded extension state (${data.isEnabled}) from storage.`);
      });
    },

    get() {
      return iState;
    }
  }
}());

//Maintains list of open Lambda School tabs.
let tabTracker = [];

//Get state from browser storage.
state.load();

//Find tabs with matching url string.
chrome.tabs.query({ url: "*://learn.lambdaschool.com/*" }, tabs => {
  for (let tab of tabs) {

    //Add UNIQUE tabs to tabTracker.
    if (tabTracker.findIndex(({ id }) => id === tab.id) === -1) {
      tabTracker.push({ id: tab.id, state: state.get() });

      //Enable dark mode on state bool value.
      if (state.get()) {
        enableCSS(tab.id);
        console.log('TabQuery: Enabled dark mode for tab ', tab.id);
      }

      //Enable page action for tracked tab.
      showPageAction(tab.id);

      console.log(`New tab added to tracker: (tab) ${tab.id}. (TabQuery)`);
    }
  }
  console.log(`tabTracker: `, tabTracker);
});

/**
 * 
 * @param {object} tab - Toggles our CSS for the tab in which the extension icon was clicked. 
 */
function toggleCSS(tab) {
  console.log(`pageAction clicked on tabId: ${tab.id}, state: ${state.get()}`);
  if (state.get()) {
    disableCSS(tab.id);
  } else {
    enableCSS(tab.id);
  }
  console.log(`pageAction cb complete. state: ${state.get()}.`);
}

/**
 * 
 * @param {integer} tabId - Inserts the dark mode style sheet. 
 */
function enableCSS(tabId) {
  //Change extension icon and title in toolbar.
  chrome.pageAction.setIcon({ 'tabId': tabId, 'path': "icons/on.png" });
  chrome.pageAction.setTitle({ 'tabId': tabId, 'title': TITLE_REMOVE });

  //Insert our dark mode style sheet.
  chrome.tabs.insertCSS({ file: CSS_PATH });

  //Enable page action for tracked tab.
  showPageAction(tabId);

  //Extension was enabled for a tab, so enable for all tabs.
  state.save(true);

  //Update tracked tab.
  let tabIdx = tabTracker.findIndex(({ id }) => id === tabId);
  tabTracker[tabIdx].state = state.get();
}

/**
 * 
 * @param {integer} tabId - Removes dark mode style sheet. 
 */
function disableCSS(tabId) {
  //Change extension icon and title in toolbar.
  chrome.pageAction.setIcon({ 'tabId': tabId, 'path': "icons/off.png" });
  chrome.pageAction.setTitle({ 'tabId': tabId, 'title': TITLE_APPLY });

  //Extension was disabled for a tab, so disable for all tabs.
  state.save(false);

  //Update tracked tab.
  let tabIdx = tabTracker.findIndex(({ id }) => id === tabId);
  tabTracker[tabIdx].state = state.get();

  //Because Chrome doesn't have a .removeCSS method, we will just reload the tab to trigger the onUpdated listener.
  chrome.tabs.reload(tabId);

  //Enable page action for tracked tab.
  showPageAction(tabId);

}

/**
 * 
 * @param {integer} tabId - Adds extension icon to the toolbar.
 */
function showPageAction(tabId) {
  chrome.pageAction.show(tabId);
}

chrome.tabs.onCreated.addListener(tab => {
  if (tab.url.search("learn.lambdaschool.com") !== -1) {
    state.load();
    if (tabTracker.findIndex(({ id }) => id === tab.id) === -1) {
      tabTracker.push({ id: tab.id, state: state.get() });

      console.log(`New tab added to tracker: (tab) ${tab.id}. (onCreated)`);
    }
    if (state.get()) {
      enableCSS(tab.id);
    }
    console.log(`tabTracker: `, tabTracker);
  }


})

chrome.tabs.onUpdated.addListener((id, changeInfo, tab) => {
  if (tab.url.search("learn.lambdaschool.com") !== -1) {
    state.load();
    if (tabTracker.findIndex(({ id }) => id === tab.id) === -1) {
      tabTracker.push({ id: tab.id, state: state.get() });
      console.log(`New tab added to tracker: (tab) ${tab.id}. (onUpdated)`);
    }

    if (state.get()) {
      enableCSS(tab.id);
      console.log('Enabled dark mode (onUpdated)');
    }

    showPageAction(tab.id);

    console.log(`tabTracker: `, tabTracker);
  }
});

chrome.tabs.onHighlighted.addListener(highlightInfo => {
  let tabId = highlightInfo.tabIds[0];
  let tabIdx = tabTracker.findIndex(({ id }) => id === tabId);
  if (tabIdx >= 0) {
    if (state.get() && tabTracker[tabIdx].state) {
      enableCSS(tabId);
    } else if (state.get() === true && tabTracker[tabIdx].state === false) {
      enableCSS(tabId);
    } else if (state.get() === false && tabTracker[tabIdx].state === true) {
      disableCSS(tabId);
    } else {
      console.log(`State not changed.`);
    }
  }
});

chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  tabTracker = tabTracker.filter(tab => tab.id !== tabId);
  console.log(`tabTracker: `, tabTracker);
});

chrome.pageAction.onClicked.addListener(toggleCSS);