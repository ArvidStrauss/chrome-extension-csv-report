//content scripts can access the website and therefore get the jwt-token and then store it in the chrome storage api
//which then can get accessed by the background-scripts
//they fire automatically when you open the website
var token = localStorage.getItem(Object.keys(localStorage).find((element) => element.match(/CognitoIdentityServiceProvider.*idToken/g)));

chrome.storage.local.set({ token: token }, function () {
  console.log('JWT-Token store in ExtensionStorage');
});
