import {
  Field,
  Experimental,
  SelfProof,
  Struct,
  Empty,
  MerkleMapWitness,
} from 'snarkyjs';

export class RollupState extends Struct({
  initialRoot: Field,
  latestRoot: Field,
}) {
  static createOneStep(
    initialRoot: Field,
    latestRoot: Field,
    key: Field,
    currentValue: Field,
    newValue: Field,
    merkleMapWitness: MerkleMapWitness,
  ): RollupState {
    const [witnessRootBefore, witnessKey] =
      merkleMapWitness.computeRootAndKey(currentValue);
    initialRoot.assertEquals(witnessRootBefore);
    witnessKey.assertEquals(key);
    const [witnessRootAfter, _] = merkleMapWitness.computeRootAndKey(newValue);
    latestRoot.assertEquals(witnessRootAfter);

    return new RollupState({
      initialRoot,
      latestRoot,
    });
  }

  static createMerged(state1: RollupState, state2: RollupState): RollupState {
    return new RollupState({
      initialRoot: state1.initialRoot,
      latestRoot: state2.latestRoot,
    });
  }

  static assertEquals(state1: RollupState, state2: RollupState): void {
    state1.initialRoot.assertEquals(state2.initialRoot);
    state1.latestRoot.assertEquals(state2.latestRoot);
  }
}

export const Rollup = Experimental.ZkProgram({
  publicInput: RollupState,

  methods: {
    oneStep: {
      privateInputs: [Field, Field, Field, Field, Field, MerkleMapWitness],

      method(
        newState: RollupState,
        initialRoot: Field,
        latestRoot: Field,
        key: Field,
        currentValue: Field,
        newValue: Field,
        merkleMapWitness: MerkleMapWitness,
      ) {
        const computedState = RollupState.createOneStep(
          initialRoot,
          latestRoot,
          key,
          currentValue,
          newValue,
          merkleMapWitness,
        );
        RollupState.assertEquals(newState, computedState);
        return undefined;
      },
    },

    merge: {
      privateInputs: [SelfProof, SelfProof],

      method(
        newState: RollupState,
        rollup1proof: SelfProof<RollupState, Empty>,
        rollup2proof: SelfProof<RollupState, Empty>,
      ) {
        rollup1proof.verify(); // A -> B
        rollup2proof.verify(); // B -> C

        rollup1proof.publicInput.initialRoot.assertEquals(newState.initialRoot);

        rollup1proof.publicInput.latestRoot.assertEquals(
          rollup2proof.publicInput.initialRoot,
        );

        rollup2proof.publicInput.latestRoot.assertEquals(newState.latestRoot);
      },
    },
  },
});

export class RollupProof extends Experimental.ZkProgram.Proof(Rollup) {}
