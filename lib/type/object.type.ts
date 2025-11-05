export type TObject = {
  [key: string]: TObject | TObject[] | string | number | boolean | null | undefined;
};

export type TNObject = {
  [key: string]: TNObject | TNObject[] | string | number | boolean;
}