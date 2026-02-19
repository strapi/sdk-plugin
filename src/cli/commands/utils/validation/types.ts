export interface Export {
  types?: string;
  source: string;
  browser?: {
    source: string;
    import?: string;
    require?: string;
  };
  node?: {
    source?: string;
    module?: string;
    import?: string;
    require?: string;
  };
  module?: string;
  import?: string;
  require?: string;
  default: string;
}
