import { Web3Provider } from '@ethersproject/providers';
import { signMessage } from './utils/web3';
import hubs from './hubs.json';
import { version } from './constants.json';

export const domain = {
  name: 'Snapshot',
  version
  // chainId: 1
};

export const getTypes = (type) => {
  const otherTypes = {
    vote: [
      { name: 'proposal', type: 'string' },
      { name: 'choice', type: 'uint32' },
      { name: 'metadata', type: 'string' }
    ],
    proposal: [
      { name: 'name', type: 'string' },
      { name: 'body', type: 'string' },
      { name: 'choices', type: 'string[]' },
      { name: 'start', type: 'uint64' },
      { name: 'end', type: 'uint64' },
      { name: 'snapshot', type: 'uint64' },
      { name: 'type', type: 'string' },
      { name: 'metadata', type: 'string' }
    ],
    settings: [
      { name: 'settings', type: 'string' }
    ],
    'delete-proposal': [
      { name: 'proposal', type: 'string' }
    ]
  }
  const types = {
    Message: [
      { name: 'version', type: 'string' },
      { name: 'space', type: 'string' },
      { name: 'timestamp', type: 'uint64' },
      { name: 'type', type: 'string' },
      { name: 'payload', type }
    ]
  }
  types[type] = otherTypes[type]
  return types;
};

export default class Client {
  readonly address: string;

  constructor(address: string = hubs[0]) {
    this.address = address;
  }

  request(command: string, body?: any) {
    const url = `${this.address}/api/${command}`;
    let init;
    if (body) {
      init = {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      };
    }
    return new Promise((resolve, reject) => {
      fetch(url, init)
        .then((res) => {
          if (res.ok) return resolve(res.json());
          throw res;
        })
        .catch((e) => e.json().then((json) => reject(json)));
    });
  }

  async send(msg: any) {
    return this.request('message', msg);
  }

  async getSpaces() {
    return this.request('spaces');
  }

  async broadcast(
    web3: Web3Provider,
    account: string,
    space: string,
    type: string,
    payload: any
  ) {
    try {
      const message = {
        version,
        timestamp: (Date.now() / 1e3).toFixed(),
        space,
        type,
        payload
      }

      const msg: any = {
        address: account,
        msg: JSON.stringify(message)
      };

      const signer = web3.getSigner();
      msg.sig = await signer._signTypedData(domain, getTypes(type), message);
      return await this.send(msg);

    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  async vote(
    web3: Web3Provider,
    address: string,
    space,
    { proposal, choice, metadata = {} }
  ) {
    return this.broadcast(web3, address, space, 'vote', {
      proposal,
      choice,
      metadata: JSON.stringify(metadata)
    });
  }

  async proposal(
    web3: Web3Provider,
    address: string,
    space: string,
    {
      name,
      body,
      choices,
      start,
      end,
      snapshot,
      type = 'single-choice',
      metadata = {}
    }
  ) {
    return this.broadcast(web3, address, space, 'proposal', {
      name,
      body,
      choices,
      start,
      end,
      snapshot,
      type,
      metadata: JSON.stringify(metadata)
    });
  }

  async deleteProposal(
    web3: Web3Provider,
    address: string,
    space: string,
    { proposal }
  ) {
    return this.broadcast(web3, address, space, 'delete-proposal', {
      proposal
    });
  }

  async settings(web3: Web3Provider, address: string, space: string, settings) {
    return this.broadcast(web3, address, space, 'settings', {
      settings
    });
  }
}
