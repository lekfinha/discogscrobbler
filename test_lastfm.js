const axios = require('axios');
axios.get('http://127.0.0.1:3001/api/v1/auth/lastfm/auth-url')
  .then(res => console.log(res.data))
  .catch(err => console.error(err.message, err.response?.data));
