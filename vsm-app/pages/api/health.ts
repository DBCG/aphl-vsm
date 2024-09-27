import { NextApiRequest, NextApiResponse } from "next";

const health = async (req: NextApiRequest, res: NextApiResponse) => {
  res.status(200).json({ status: 'ok' });
}

export default health