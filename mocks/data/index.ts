import vc from './vc';

export const data =  {
  "https://vc.inrupt.com/credentials/v1": vc
}

export const response = {
  "https://vc.inrupt.com/credentials/v1": () => new Response(JSON.stringify(vc), {
    headers: new Headers([
      ['content-type', 'application/ld+json']
    ])
  })
}
