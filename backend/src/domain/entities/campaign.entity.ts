// Domain Entity - Campaign (MAIN AGGREGATE ROOT)
// Section 3.3 of Master Prompt

export enum CampaignTypeEnum {
  CRM = 'CRM',
  MASS = 'MASS',
}

export class Campaign {
  readonly id: string;
  readonly name: string;
  readonly type: CampaignTypeEnum;
  readonly rMin: number;
  readonly rMax: number;
  readonly zK: number;
  readonly cK: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(props: {
    id: string;
    name: string;
    type: CampaignTypeEnum;
    rMin: number;
    rMax: number;
    zK: number;
    cK: number;
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.id = props.id;
    this.name = props.name;
    this.type = props.type;
    this.rMin = props.rMin;
    this.rMax = props.rMax;
    this.zK = props.zK;
    this.cK = props.cK;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      rMin: this.rMin,
      rMax: this.rMax,
      zK: this.zK,
      cK: this.cK,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
