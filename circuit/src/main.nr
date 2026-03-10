use std::hash::poseidon::bn254::hash_2;

fn main(
    threshold_1: pub u64,
    threshold_2: pub u64,
    threshold_3: pub u64,
    commitment: pub Field,
    deposit_amount: u64,
    deposit_secret: Field,
) -> pub u64 {
    let computed = hash_2([deposit_amount as Field, deposit_secret]);
    assert(computed == commitment);
    assert(deposit_amount >= threshold_1);

    let mut reward: u64 = 0;

    if deposit_amount < threshold_2 {
        reward = 100;
    } else {
        if deposit_amount < threshold_3 {
            reward = 200;
        } else {
            reward = 300;
        }
    }
    reward
}
