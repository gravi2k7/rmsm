import { IsString, Matches } from "class-validator";

export class UpdatePendingOrderDto {
  @IsString()
  @Matches(/^(?:0|[1-9]\d*)(?:\.\d+)$/, {
    message: "Price must be a valid positive decimal",
  })
  price!: string;
}
