export function createFirebaseLeaderStore(firebaseClient) {
  function isReady() {
    return firebaseClient.isReady();
  }

  async function load() {
    return firebaseClient.loadLeaderboard();
  }

  async function save(result) {
    return firebaseClient.saveResult(result);
  }

  return { isReady, load, save };
}
