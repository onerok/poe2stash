import axios from "axios";

async function test() {
  const url =
    "pathofexile.com/api/trade2/fetch/25832d90f5375a3afdccdf892ede7649bdfdc37ea9fe7c6047e6839ea602aa12,90227061dd3e8c0dbe5b4d96b17e64e88eb9544d9794808f0d59318e96a093a1,d9d69aff5e0b2e002119787f498794e9a207d47f85bf5cb0557b13afd83910c6,c42aa50230e620f85135f33bf629f6dbafe7c304d7e109c162925009a5e9ebe6,cccabd718d212703dcadb6026ab1b8ee8b0d2ad3976d2949a4b1ed9b2c51a25b,0de56428ab6752b8452e03a63c078346413df1c562f7b556a1f34923c516e4a1,0157915264df2ea76a6fb7562b4d79aa2f34f3edaa1a67b4247760e2f9ea9f59,f9e38ce69920e9bcbeeebfd05bddc8fed62ef854022757fce451b3e3907df0a0,57f51047863e0531f8452ed385166d6d435a7fb582d1248d472d72fd3c8f6e17,0988c030e6eb8403524f6d461f9a7720c6142bcbd2c520d70f93e784d5ed5b6d?query=RnXVJ2ac7&realm=poe2";

  const port = process.env.PORT || 7555;
  const data = await axios.get(`http://localhost:${port}/proxy/${url}`);

  console.log(data.data);
}
test();
