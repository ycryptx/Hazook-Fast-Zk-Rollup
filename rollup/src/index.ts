import {
  Field,
  Experimental,
  SelfProof,
  Struct,
  Empty,
  MerkleMapWitness,
  MerkleMap,
} from 'o1js';

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
    initialRoot.assertEquals(
      witnessRootBefore,
      'createOneStep: initialRoot == witnessRootBefore',
    );
    witnessKey.assertEquals(key, 'createOneStep: witnessKey == key');
    const [witnessRootAfter, _] = merkleMapWitness.computeRootAndKey(newValue);
    latestRoot.assertEquals(
      witnessRootAfter,
      'createOneStep: latestRoot == witnessRootAfter',
    );

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
    state1.initialRoot.assertEquals(
      state2.initialRoot,
      'RollupState: initialRoot1 == initialRoot2',
    );
    state1.latestRoot.assertEquals(
      state2.latestRoot,
      'RollupState: latestRoot1 == latestRoot2',
    );
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

        rollup1proof.publicInput.initialRoot.assertEquals(
          newState.initialRoot,
          'merge: rollup1Proof.initialRoot == newState.initialRoot',
        );

        rollup1proof.publicInput.latestRoot.assertEquals(
          rollup2proof.publicInput.initialRoot,
          'merge: rollup1Proof.latestRoot == rollup2Proof.initialRoot',
        );

        rollup2proof.publicInput.latestRoot.assertEquals(
          newState.latestRoot,
          'merge: rollup2Proof.latestRoot == newState.latestRoot',
        );
      },
    },
  },
});

export class RollupProof extends Experimental.ZkProgram.Proof(Rollup) {
  //
}

export type Transaction = number;

export class SerializedTransaction {
  initialRoot: Field;
  latestRoot: Field;
  key: Field;
  currentValue: Field;
  newValue: Field;
  merkleMapWitness: MerkleMapWitness;

  constructor(params: {
    initialRoot: Field;
    latestRoot: Field;
    key: Field;
    currentValue: Field;
    newValue: Field;
    merkleMapWitness: MerkleMapWitness;
  }) {
    const {
      initialRoot,
      latestRoot,
      key,
      currentValue,
      newValue,
      merkleMapWitness,
    } = params;
    this.initialRoot = initialRoot;
    this.latestRoot = latestRoot;
    this.key = key;
    this.currentValue = currentValue;
    this.newValue = newValue;
    this.merkleMapWitness = merkleMapWitness;
  }

  toJSON(): JSONSerializedTransaction {
    return {
      initialRoot: this.initialRoot.toJSON(),
      latestRoot: this.latestRoot.toJSON(),
      key: this.key.toJSON(),
      currentValue: this.currentValue.toJSON(),
      newValue: this.newValue.toJSON(),
      merkleMapWitness: this.merkleMapWitness.toJSON(),
    };
  }
}

export type JSONSerializedTransaction = {
  initialRoot: string;
  latestRoot: string;
  key: string;
  currentValue: string;
  newValue: string;
  merkleMapWitness: string;
};

export class TransactionPreProcessor {
  merkleMap: MerkleMap;
  currentValue: Field;
  constructor() {
    this.merkleMap = new MerkleMap();
    this.currentValue = Field(0);
  }

  public processTx(tx: Transaction): SerializedTransaction {
    const initialRoot = this.merkleMap.getRoot();
    const newValue = Field(tx);
    const key = Field(this.merkleMap.tree.leafCount);
    const currentValue = Field(this.currentValue.value);

    this.merkleMap.set(key, newValue);
    this.currentValue = newValue;

    return new SerializedTransaction({
      initialRoot: initialRoot,
      latestRoot: this.merkleMap.getRoot(),
      key,
      currentValue,
      newValue,
      merkleMapWitness: this.merkleMap.getWitness(key),
    });
  }
}

export class Accumulator {
  private _accumulatedProof: RollupProof;

  public async addProof(proof: RollupProof): Promise<void> {
    if (!this._accumulatedProof) {
      this._accumulatedProof = proof;
      return;
    }

    const currentState = new RollupState({
      initialRoot: this._accumulatedProof.publicInput.initialRoot,
      latestRoot: this._accumulatedProof.publicInput.latestRoot,
    });

    const newState = RollupState.createMerged(
      currentState,
      new RollupState({
        initialRoot: proof.publicInput.initialRoot,
        latestRoot: proof.publicInput.latestRoot,
      }),
    );

    this._accumulatedProof = await Rollup.merge(
      newState,
      this._accumulatedProof,
      proof,
    );
  }

  public get accumulatedProof(): RollupProof {
    return this._accumulatedProof;
  }
}
