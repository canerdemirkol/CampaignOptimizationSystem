// Domain Entity - GeneralParameters (Campaign Child Entity)
// Section 3.4 of Master Prompt

export class GeneralParameters {
  readonly id: string;
  readonly campaignId: string;
  readonly cMin: number;
  readonly cMax: number;
  readonly nMin: number;
  readonly nMax: number;
  readonly bMin: number;
  readonly bMax: number;
  readonly mMin: number;
  readonly mMax: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(props: {
    id: string;
    campaignId: string;
    cMin: number;
    cMax: number;
    nMin: number;
    nMax: number;
    bMin: number;
    bMax: number;
    mMin: number;
    mMax: number;
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.validate(props);
    this.id = props.id;
    this.campaignId = props.campaignId;
    this.cMin = props.cMin;
    this.cMax = props.cMax;
    this.nMin = props.nMin;
    this.nMax = props.nMax;
    this.bMin = props.bMin;
    this.bMax = props.bMax;
    this.mMin = props.mMin;
    this.mMax = props.mMax;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  private validate(props: { cMin: number; cMax: number; nMin: number; nMax: number; bMin: number; bMax: number; mMin: number; mMax: number }): void {
    if (props.cMin > props.cMax) {
      throw new Error('cMin cannot be greater than cMax');
    }
    if (props.nMin > props.nMax) {
      throw new Error('nMin cannot be greater than nMax');
    }
    if (props.bMin > props.bMax) {
      throw new Error('bMin cannot be greater than bMax');
    }
    if (props.mMin > props.mMax) {
      throw new Error('mMin cannot be greater than mMax');
    }
  }
}
