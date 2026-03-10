export function parseCalldata(calldata: (string | bigint)[], startIndex = 4) {
  const array = calldata.map((x) => BigInt(x));

  const threshold1 = array[startIndex];
  const threshold2 = array[startIndex + 2];
  const threshold3 = array[startIndex + 4];

  const commitmentLimb1 = array[startIndex + 6];
  const commitmentLimb2 = array[startIndex + 7];
  const commitment = (commitmentLimb2 << 128n) + commitmentLimb1;

  const depositAmount = array[startIndex + 8];

  return {
    thresholds: [threshold1, threshold2, threshold3],
    commitment,
    yield: depositAmount,
  };
}
