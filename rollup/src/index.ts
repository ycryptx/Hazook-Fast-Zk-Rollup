import {
  Field,
  Experimental,
  SelfProof,
  Struct,
  Empty,
  MerkleMapWitness,
  MerkleMap,
  Proof,
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
    const [witnessRootAfter] = merkleMapWitness.computeRootAndKey(newValue);
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

// TODO: document
export abstract class RollupProofBase {
  public abstract merge(newProof: RollupProofBase): Promise<RollupProofBase>;
  public abstract toJSON(): any;
  public abstract fromJSON(p: any): RollupProofBase;
}

export interface RollupBase {
  compile: () => void;
}

// TODO: document
export abstract class TransactionBase {
  abstract serialize(): string;
  abstract deserialize(serialized: string): void;
  abstract baseFn(): Promise<any>;
}

// TODO: explain
export class MyRollupProof extends Experimental.ZkProgram.Proof(Rollup) {
  public async merge(newProof: MyRollupProof): Promise<MyRollupProof> {
    const currentState = new RollupState({
      initialRoot: this.publicInput.initialRoot,
      latestRoot: this.publicInput.latestRoot,
    });

    const newState = RollupState.createMerged(
      currentState,
      new RollupState({
        initialRoot: newProof.publicInput.initialRoot,
        latestRoot: newProof.publicInput.latestRoot,
      }),
    );

    const mergedProof = await Rollup.merge(newState, this, newProof);
    return mergedProof as MyRollupProof;
  }
  public fromJSON(json: any): MyRollupProof {
    const proofClass = Proof<RollupState, void>;
    return proofClass.fromJSON(json) as MyRollupProof;
  }
}

// TODO: explain
export class MyTransaction extends TransactionBase {
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
    super();
    this.initialRoot = params.initialRoot;
    this.latestRoot = params.latestRoot;
    this.key = params.key;
    this.currentValue = params.currentValue;
    this.newValue = params.newValue;
    this.merkleMapWitness = params.merkleMapWitness;
  }

  public serialize(): string {
    return JSON.stringify({
      initialRoot: this.initialRoot.toJSON(),
      latestRoot: this.latestRoot.toJSON(),
      key: this.key.toJSON(),
      currentValue: this.currentValue.toJSON(),
      newValue: this.newValue.toJSON(),
      merkleMapWitness: this.merkleMapWitness.toJSON(),
    });
  }

  public deserialize(serialized: string): any {
    const txJson = JSON.parse(serialized);
    this.initialRoot = Field(txJson.initialRoot);
    this.latestRoot = Field(txJson.latestRoot);
    this.key = Field(txJson.key);
    this.currentValue = Field(txJson.currentValue);
    this.newValue = Field(txJson.newValue);
    this.merkleMapWitness = MerkleMapWitness.fromJSON(txJson.merkleMapWitness);
  }

  public async baseFn(): Promise<any> {
    const state = new RollupState({
      initialRoot: this.initialRoot,
      latestRoot: this.latestRoot,
    });

    return await Rollup.oneStep(
      state,
      this.initialRoot,
      this.latestRoot,
      this.key,
      this.currentValue,
      this.newValue,
      this.merkleMapWitness,
    );
  }
}

export class TransactionPreProcessor {
  merkleMap: MerkleMap;
  currentValue: Field;
  constructor() {
    this.merkleMap = new MerkleMap();
    this.currentValue = Field(0);
  }

  public processTx(tx: number): MyTransaction {
    const initialRoot = this.merkleMap.getRoot();
    const newValue = Field(tx);
    const key = Field(this.merkleMap.tree.leafCount);
    const currentValue = Field(this.currentValue.value);

    this.merkleMap.set(key, newValue);
    this.currentValue = newValue;

    return new MyTransaction({
      initialRoot: initialRoot,
      latestRoot: this.merkleMap.getRoot(),
      key,
      currentValue,
      newValue,
      merkleMapWitness: this.merkleMap.getWitness(key),
    });
  }
}
