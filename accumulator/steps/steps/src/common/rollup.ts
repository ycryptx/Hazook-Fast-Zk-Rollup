import {
  Field,
  Experimental,
  SelfProof,
  Struct,
  Empty,
  Poseidon,
} from 'snarkyjs';

export class RollupState extends Struct({
  hashedSum: Field,
  sum: Field,
}) {
  static createOneStep(number: Field): RollupState {
    return new RollupState({
      hashedSum: Poseidon.hash([number]),
      sum: number,
    });
  }
  static createMerged(state1: RollupState, state2: RollupState): RollupState {
    const sum = state1.sum.add(state2.sum);
    return new RollupState({
      hashedSum: Poseidon.hash([sum]),
      sum,
    });
  }
  static assertEquals(state1: RollupState, state2: RollupState): void {
    state1.hashedSum.assertEquals(state2.hashedSum);
    state1.sum.assertEquals(state2.sum);
  }
}

export const Rollup = Experimental.ZkProgram({
  publicInput: RollupState,
  publicOutput: Empty,

  methods: {
    oneStep: {
      privateInputs: [],

      method(state: RollupState) {
        const computedState = RollupState.createOneStep(state.sum);
        RollupState.assertEquals(state, computedState);
        return undefined;
      },
    },

    merge: {
      privateInputs: [SelfProof, SelfProof],

      method(
        newState: RollupState,
        state1Proof: SelfProof<RollupState, Empty>,
        state2Proof: SelfProof<RollupState, Empty>,
      ) {
        state1Proof.verify();
        state2Proof.verify();

        const expectedSum = state1Proof.publicInput.sum.add(
          state2Proof.publicInput.sum,
        );

        newState.sum.equals(expectedSum);
        newState.hashedSum.equals(Poseidon.hash([expectedSum]));

        return undefined;
      },
    },
  },
});

export class RollupProof extends Experimental.ZkProgram.Proof(Rollup) {}
