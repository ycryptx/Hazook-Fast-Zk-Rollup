import { Proof, Cache } from 'o1js';
import { MyRollupProof, Rollup, MyTransaction } from './myRollup';

/**
 * You must define a class that implements {@link RollupProofBase}.
 *
 * This class acts as a wrapper around a ZkApp's {@link Proof} object giving the sequencer and Hadoop an abstracted
 * way to serialize, deserialize, and accumulate proofs.
 *
 * Refer to {@link MyRollupProof} in [myRollup.ts](./myRollup.ts) for an example implementation.
 */
export abstract class RollupProofBase {
  /**
   * Creates a new proof that is the accumulation of this proof and newProof. This function should internally call the
   * function in your ZkApp that validates each proof as well as the transition to the new state.
   *
   * Refer to {@link MyRollupProof} in [myRollup.ts](./myRollup.ts) for an example implementation.
   * Also refer to [this link](https://docs.minaprotocol.com/zkapps/tutorials/recursion#scaling-throughput-with-zkrollups-and-app-chains)
   * for a more comprehensive overview of how your ZkApp merge function should be implemented
   * @param {RollupProofBase} newProof
   * @returns {Promise<RollupProofBase>} the merged proof
   */
  public abstract merge(newProof: RollupProofBase): Promise<RollupProofBase>;

  /**
   * Convert this proof into a plain JSON object and return that new object
   *
   * Refer to {@link MyRollupProof} in [myRollup.ts](./myRollup.ts) for an example implementation.
   * @returns {Object}
   */
  public abstract toJSON(): any;

  /**
   * Deserializes a plain JSON object into a new {@link RollupProofBase}
   *
   *
   * Refer to {@link MyRollupProof} in [myRollup.ts](./myRollup.ts) for an example implementation.
   * @param {Object} p object
   * @returns {RollupProofBase} a new {@link RollupProofBase}
   */
  public abstract fromJSON(p: any): RollupProofBase;
}

/**
 * Your ZkApp should at minimum follow this interface {@link RollupBase}.
 *
 * For an example implementation of a ZkApp refer to {@link Rollup} in [myRollup.ts](./myRollup.ts).
 */
export interface RollupBase {
  compile: (options?: { cache: Cache }) => Promise<any>;
}

/**
 * You must define a class that implements {@link TransactionBase}
 *
 * This class acts as a wrapper around your ZkApp's transactions. You are free to structure your transaction
 * object however you like, just make sure that the implemented methods of this class are aware of the various
 * types of transactions in your ZkApp.
 *
 * The purpose of defining this class is to give the sequencer and Hadoop an abstracted way to serialize and
 * deserialize user transactions, and to produce the transaction's base proof.
 *
 * For an example implementation of a {@link TransactionBase} refer to {@link MyTransaction} in [myRollup.ts](./myRollup.ts).
 */
export abstract class TransactionBase {
  /**
   * Serializes this transaction into a string
   *
   * Refer to {@link MyTransaction} in [myRollup.ts](./myRollup.ts) for an example implementation.
   * @returns {string} serialized
   */
  abstract serialize(): string;

  /**
   * Deserializes and sets this {@link TransactionBase} to the deserialized transaction
   *
   * Refer to {@link MyTransaction} in [myRollup.ts](./myRollup.ts) for an example implementation.
   * @param {string} serialized
   */
  abstract deserialize(serialized: string): void;

  /**
   * Produces a proof for this transaction.
   *
   * Internally this function should call the function/s in your ZkApp that produces the base proof for this transaction
   *
   * Refer to {@link MyTransaction} in [myRollup.ts](./myRollup.ts) for an example implementation.
   * @returns {Promise<RollupProofBase>} proof
   */
  abstract baseFn(): Promise<RollupProofBase>;
}
