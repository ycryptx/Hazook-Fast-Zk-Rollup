import {
  Field,
  Experimental,
  SelfProof,
  Struct,
  Empty,
  MerkleMapWitness,
  Bool,
  PrivateKey,
  Poseidon,
  Provable,
  MerkleWitness,
  MerkleMap,
  MerkleTree,
} from 'snarkyjs';

export class MerkleWitness1000 extends MerkleWitness(1000) {}

export class RollupState extends Struct({
  voteYes: Field,
  voteNo: Field,
  votersRoot: Field,
  initialNullifierRoot: Field,
  latestNullifierRoot: Field,
}) {
  static createOneStep(
    state: RollupState,
    voterPrivateKey: PrivateKey,
    voteYes: Bool,
    randomness: Field,
    voterWitness: MerkleWitness1000,
    nullifierWitness: MerkleMapWitness,
  ): RollupState {
    const publicKey = voterPrivateKey.toPublicKey();

    const votersRoot = voterWitness.calculateRoot(
      Poseidon.hash(publicKey.toFields()),
    );
    state.votersRoot.assertEquals(votersRoot);

    const nullifier = Poseidon.hash(
      voterPrivateKey.toFields().concat(randomness),
    );
    const [nullifierRootBefore, nullifierWitnessKey] =
      nullifierWitness.computeRootAndKey(Field(0));
    state.latestNullifierRoot.assertEquals(nullifierRootBefore);
    nullifier.assertEquals(nullifierWitnessKey);

    const [nullifierRootAfter] = nullifierWitness.computeRootAndKey(Field(1));

    return new RollupState({
      voteYes: Provable.if(
        voteYes,
        Field,
        state.voteYes.add(Field(1)),
        state.voteYes,
      ),
      voteNo: Provable.if(
        voteYes.not(),
        Field,
        state.voteNo.add(Field(1)),
        state.voteNo,
      ),
      votersRoot: state.votersRoot,
      initialNullifierRoot: state.initialNullifierRoot,
      latestNullifierRoot: nullifierRootAfter,
    });
  }

  static createMerged(state1: RollupState, state2: RollupState): RollupState {
    return new RollupState({
      voteYes: state1.voteYes.add(state2.voteYes),
      voteNo: state1.voteNo.add(state2.voteNo),
      votersRoot: state1.votersRoot,
      initialNullifierRoot: state1.initialNullifierRoot,
      latestNullifierRoot: state2.latestNullifierRoot,
    });
  }

  static assertEquals(state1: RollupState, state2: RollupState): void {
    state1.voteYes.assertEquals(state2.voteYes);
    state1.voteNo.assertEquals(state2.voteNo);
    state1.votersRoot.assertEquals(state2.votersRoot);
    state1.initialNullifierRoot.assertEquals(state2.initialNullifierRoot);
    state1.latestNullifierRoot.assertEquals(state2.latestNullifierRoot);
  }
}

export const Rollup = Experimental.ZkProgram({
  publicInput: RollupState,

  methods: {
    oneStep: {
      privateInputs: [
        PrivateKey,
        Bool,
        Field,
        MerkleWitness1000,
        MerkleMapWitness,
      ],

      method(
        newState: RollupState,
        voterPrivateKey: PrivateKey,
        voteYes: Bool,
        randomness: Field,
        voterWitness: MerkleWitness1000,
        nullifierWitness: MerkleMapWitness,
      ) {
        const computedState = RollupState.createOneStep(
          newState,
          voterPrivateKey,
          voteYes,
          randomness,
          voterWitness,
          nullifierWitness,
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

        rollup1proof.publicInput.initialNullifierRoot.assertEquals(
          newState.initialNullifierRoot,
        );

        rollup1proof.publicInput.latestNullifierRoot.assertEquals(
          rollup2proof.publicInput.initialNullifierRoot,
        );

        rollup2proof.publicInput.latestNullifierRoot.assertEquals(
          newState.latestNullifierRoot,
        );

        const expectedVoteYes = rollup1proof.publicInput.voteYes.add(
          rollup2proof.publicInput.voteYes,
        );
        const expectedVoteNo = rollup1proof.publicInput.voteNo.add(
          rollup2proof.publicInput.voteNo,
        );
        expectedVoteYes.assertEquals(newState.voteYes);
        expectedVoteNo.assertEquals(newState.voteNo);
      },
    },
  },
});

export class RollupProof extends Experimental.ZkProgram.Proof(Rollup) {}

export type Transaction = {
  voteYes: boolean;
  privateKey: string;
  randomness: string;
  voters: MerkleTree;
  voterIndex: number;
};

export class SerializedTransaction {
  voteYes: Bool;
  privateKey: PrivateKey;
  randomness: Field;
  initialNullifierRoot: Field;
  latestNullifierRoot: Field;
  voterWitness: MerkleWitness1000;
  nullifierWitness: MerkleMapWitness;

  constructor(params: {
    voteYes: Bool;
    privateKey: PrivateKey;
    randomness: Field;
    initialNullifierRoot: Field;
    latestNullifierRoot: Field;
    voterWitness: MerkleWitness1000;
    nullifierWitness: MerkleMapWitness;
  }) {
    const {
      voteYes,
      privateKey,
      randomness,
      initialNullifierRoot,
      latestNullifierRoot,
      voterWitness,
      nullifierWitness,
    } = params;
    this.initialNullifierRoot = initialNullifierRoot;
    this.latestNullifierRoot = latestNullifierRoot;
    this.privateKey = privateKey;
    this.randomness = randomness;
    this.voteYes = voteYes;
    this.voterWitness = voterWitness;
    this.nullifierWitness = nullifierWitness;
  }

  toJSON(): JSONSerializedTransaction {
    return {
      initialNullifierRoot: this.initialNullifierRoot.toJSON(),
      latestNullifierRoot: this.latestNullifierRoot.toJSON(),
      voteYes: this.voteYes.toJSON(),
      voterWitness: this.voterWitness.toJSON(),
      nullifierWitness: this.nullifierWitness.toJSON(),
      privateKey: this.privateKey.toJSON(),
      randomness: this.randomness.toJSON(),
    };
  }
}

export type JSONSerializedTransaction = {
  initialNullifierRoot: string;
  latestNullifierRoot: string;
  voteYes: boolean;
  privateKey: string;
  randomness: string;
  voterWitness: string;
  nullifierWitness: string;
};

export class TransactionPreProcessor {
  nullifierMerkleMap: MerkleMap;
  constructor() {
    this.nullifierMerkleMap = new MerkleMap();
  }

  public processTx(tx: Transaction): SerializedTransaction {
    const initialNullifierRoot = this.nullifierMerkleMap.getRoot();
    const privateKey = PrivateKey.fromJSON(tx.privateKey);
    const voterWitness = tx.voters.getWitness(BigInt(tx.voterIndex));
    const randomness = Field(tx.randomness);
    const nullifier = Poseidon.hash(privateKey.toFields().concat(randomness));

    this.nullifierMerkleMap.set(nullifier, Field(1));

    return new SerializedTransaction({
      voteYes: Bool(tx.voteYes),
      privateKey,
      randomness,
      initialNullifierRoot: initialNullifierRoot,
      latestNullifierRoot: this.nullifierMerkleMap.getRoot(),
      voterWitness: new MerkleWitness1000(voterWitness),
      nullifierWitness: this.nullifierMerkleMap.getWitness(nullifier),
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
      voteYes: this._accumulatedProof.publicInput.voteYes,
      voteNo: this._accumulatedProof.publicInput.voteNo,
      votersRoot: this._accumulatedProof.publicInput.votersRoot,
      initialNullifierRoot:
        this._accumulatedProof.publicInput.initialNullifierRoot,
      latestNullifierRoot:
        this._accumulatedProof.publicInput.latestNullifierRoot,
    });

    const newState = RollupState.createMerged(
      currentState,
      new RollupState({
        voteYes: proof.publicInput.voteYes,
        voteNo: proof.publicInput.voteNo,
        votersRoot: proof.publicInput.votersRoot,
        initialNullifierRoot: proof.publicInput.initialNullifierRoot,
        latestNullifierRoot: proof.publicInput.latestNullifierRoot,
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
