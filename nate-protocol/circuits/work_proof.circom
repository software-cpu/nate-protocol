pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/comparators.circom";
include "../node_modules/circomlib/circuits/poseidon.circom";

/**
 * @title Private Productivity Proof
 * @dev Proves that Nate worked enough hours on a specific project,
 * without revealing the exact hours or the project name.
 */
template WorkProof() {
    // ============ Public Inputs ============
    signal input minHoursThreshold;  // e.g. 4
    signal input projectHash;        // Poseidon(secretProjectID, salt)

    // ============ Private Inputs ============
    signal input deepWorkHours;      // e.g. 6
    signal input secretProjectID;    // numeric ID of the secret project
    signal input salt;               // random salt to secure the hash

    // ============ Outputs ============
    // Implicitly, if proof verifies, constraints are met.
    // We can output a "creditScore" or just valid/invalid signal.

    // 1. Verify Productivity: deepWorkHours >= minHoursThreshold
    // Use GreaterEqThing template (n bits)
    component ge = GreaterEqThan(32); // 32 bits is plenty for hours
    ge.in[0] <== deepWorkHours;
    ge.in[1] <== minHoursThreshold;
    
    // Enforce the check (must be true)
    ge.out === 1;

    // 2. Verify Project Identity: hash(id, salt) == projectHash
    // Use Poseidon hash (more efficient for ZK than Sha256)
    component hasher = Poseidon(2);
    hasher.inputs[0] <== secretProjectID;
    hasher.inputs[1] <== salt;

    // Enforce the hash match
    projectHash === hasher.out;
}

component main {public [minHoursThreshold, projectHash]} = WorkProof();
