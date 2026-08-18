export function createServerLeaderStore(apiClient) {
  function isReady() {
    return true;
  }

  async function load() {
    const result = await apiClient.getLeaderboard();
    return result.leaders;
  }

  async function save(result) {
    const saved = await apiClient.saveResult(result);
    return saved.leaders;
  }

  return { isReady, load, save };
}
