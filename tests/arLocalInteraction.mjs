import ArLocal from 'arlocal';
//import address from '../address.json';

(async () => {
  const port = 1984;
  const address = 'B-hx-NUejoYSA-A3o_ujD0PX9BjSi8WGTUNGxzoXssc';

  const arLocal = new ArLocal(port);

  // Start is a Promise, we need to start it inside an async function.
  await arLocal.start();

  // Fetch endpoints
  //console.log(address.address);
  await fetch(`http://localhost:${port}/${address}/20000000000000`);
  await fetch(`http://localhost:${port}/mine`);

  // Your tests here...



  // After we are done with our tests, let's close the connection.
  await arLocal.stop();
})();