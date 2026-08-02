const worker = {
  fetch() {
    return new Response("StressSignal D1 test worker");
  },
};

export default worker;
