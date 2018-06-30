const API_BASE = "http://free.currencyconverterapi.com/api/v5/";
const API_CURRENCIES = API_BASE + "currencies";

/**
 * Install the service worker
 */
async function installServiceWorkerAsync() {
  if ('serviceWorker' in navigator) {
    try {
      let serviceWorker = await navigator.serviceWorker.register('/sw.js')
      console.log(`Service worker registered ${serviceWorker}`)
    } catch (err) {
      console.error(`Failed to register service worker: ${err}`)
    }
  }
}

/**
 * loadCurrencies from the internet and place it on a target element
 */
fetch('http://free.currencyconverterapi.com/api/v5/currencies', {
  method: 'get'
}).then(function (response) {

  return response.json();
}).then(function (results) {

  var words = Object.values(results);

  let fullResult = words[0];



  const databasePromise = idb.open('currency', 1, function (upgradeDb) {
    let keyValueStored = upgradeDb.createObjectStore('keyval', {
      keyPath: 'id'
    });
  });

  
    databasePromise.then( db => {
      let text = db.transaction('keyval', 'readwrite');
      let keyValueStored = text.objectStore('keyval');
          
      Object.keys(fullResult).forEach( key => {
        let obj = fullResult[key];
        keyValueStored.put(obj);
      });

    });  

  // read "hello" in "keyval"
  databasePromise.then( db => {
    let text = db.transaction('keyval');
    let keyValueStored = text.objectStore('keyval');
    return keyValueStored.getAllKeys();
  }).then(function (val) {
     
    for (const id of val) {

      let nodes = document.createElement("option");
      let textNodes = document.createTextNode(`${id}`);
      nodes.appendChild(textNodes);
      document.getElementById("fromCurrency").appendChild(nodes);
    
    }

    for (const id of val) {

      let nodes = document.createElement("option");
      let textNodes = document.createTextNode(`${id}`);
      nodes.appendChild(textNodes);
      document.getElementById("toCurrency").appendChild(nodes);

    }

  });
  
}).catch(function (err) {
 
});

// Convertion

document.getElementById("convert").onclick = function () {

  let elementFromCurrency = document.getElementById("fromCurrency");
  let selectedFromCurrency = elementFromCurrency[elementFromCurrency.selectedIndex].text;

  let elementToCurrency = document.getElementById("toCurrency");
  let selectedToCurrency = elementToCurrency[elementToCurrency.selectedIndex].text;

  const query = selectedFromCurrency + '_' + selectedToCurrency;


  let amount = document.getElementById("amount").value; 


  fetch('http://free.currencyconverterapi.com/api/v5/convert?q='+ query + '&compact=ultra', {
    method: 'get'
  }).then(function (response) {

    return response.json();
  }).then(function (results) {

    const databasePromise = idb.open('conversions', 1, upgradeDB => {
      upgradeDB.createObjectStore('keyval');
    });

    const idbKeyval = {
      get(key) {
        return databasePromise.then(db => {
          return db.transaction('keyval')
            .objectStore('keyval').get(key);
        });
      },
      set(key, val) {
        return databasePromise.then(db => {
          const text = db.transaction('keyval', 'readwrite');
          text.objectStore('keyval').put(val, key);
          return text.complete;
        });
      },
      delete(key) {
        return databasePromise.then(db => {
          const text = db.transaction('keyval', 'readwrite');
          text.objectStore('keyval').delete(key);
          return text.complete;
        });
      },
      clear() {
        return databasePromise.then(db => {
          const text = db.transaction('keyval', 'readwrite');
          text.objectStore('keyval').clear();
          return text.complete;
        });
      },
      keys() {
        return databasePromise.then(db => {
          const text = db.transaction('keyval');
          const keys = [];
          const store = text.objectStore('keyval');

          // This would be store.getAllKeys(), but it isn't supported by Edge or Safari.
          // openKeyCursor isn't supported by Safari, so we fall back
          (store.iterateKeyCursor || store.iterateCursor).call(store, cursor => {
            if (!cursor) return;
            keys.push(cursor.key);
            cursor.continue();
          });

          return text.complete.then(() => keys);
        });
      }
    };


    Object.keys(results).forEach(key => {
      let obj = results[key];
      idbKeyval.set(key, obj);
    });

    idbKeyval.get(query).then(val => {

      let convertedTo = val * amount;

      document.getElementById("convertedTo").value = convertedTo;
      
    });

  }).catch(function (err) {

  });

};
