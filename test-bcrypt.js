const bcrypt = require('bcryptjs');
try {
  bcrypt.hashSync("test", 12);
  console.log("hash OK");
  bcrypt.compareSync("test", "invalid hash");
  console.log("compare OK");
} catch (e) {
  console.log(e.message);
}
