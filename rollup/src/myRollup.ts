/**
 * This file contains a dummy ZkApp and the associated implementation
 * of the required abstract classes (please refer to ./generics.ts)
 * for using the sequencer and hadoop. This ZkApp adds a number a
 * number to a MerkleMap and holds the state of the latest and previous
 * MerkleMap.
 *
 * @note Make sure to create your own implementation of all classes in this file.
 * Refer to (this file)[./generics.ts] for more information
 */

import {
  Field,
  Experimental,
  SelfProof,
  Struct,
  Empty,
  MerkleMapWitness,
  MerkleMap,
} from 'o1js';
import { RollupProofBase, TransactionBase } from './generics';

/**
 * A helper class for working with {@link Rollup}, our dummy ZkApp
 */
class RollupState extends Struct({
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

/**
 * Our dummy ZkApp; you should replace it with your own ZkApp.
 */
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

/**
 * An implementation of {@link RollupProofBase}
 */
export class MyRollupProof
  extends Experimental.ZkProgram.Proof(Rollup)
  implements RollupProofBase
{
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
    return new MyRollupProof(mergedProof);
  }
  public fromJSON(json: any): MyRollupProof {
    return new MyRollupProof(MyRollupProof.fromJSON(json));
  }
}

/**
 * An implementation of {@link TransactionBase}
 */
export class MyTransaction implements TransactionBase {
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
    if (params != null) {
      this.initialRoot = params.initialRoot;
      this.latestRoot = params.latestRoot;
      this.key = params.key;
      this.currentValue = params.currentValue;
      this.newValue = params.newValue;
      this.merkleMapWitness = params.merkleMapWitness;
    }
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

  public deserialize(serialized: string): void {
    const txJson = JSON.parse(serialized);
    this.initialRoot = Field(txJson.initialRoot);
    this.latestRoot = Field(txJson.latestRoot);
    this.key = Field(txJson.key);
    this.currentValue = Field(txJson.currentValue);
    this.newValue = Field(txJson.newValue);
    this.merkleMapWitness = MerkleMapWitness.fromJSON(txJson.merkleMapWitness);
  }

  public async baseFn(): Promise<MyRollupProof> {
    const state = new RollupState({
      initialRoot: this.initialRoot,
      latestRoot: this.latestRoot,
    });

    const proof = await Rollup.oneStep(
      state,
      this.initialRoot,
      this.latestRoot,
      this.key,
      this.currentValue,
      this.newValue,
      this.merkleMapWitness,
    );
    return new MyRollupProof(proof);
  }
}

/**
 * A helper to convert a plain user transaction into a transaction that can be provable.
 * In our case a user transaction is simply an integer sent by the user.
 * The role of {@link TransactionPreProcessor} is from a set of these plain user transactions generate
 * each transaction's merkle root and convert the transaction into {@link MyTransaction}
 *
 *
 * @note you will want to implement your own TransactionPreProcessor according to the structure of your transactions
 */
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
