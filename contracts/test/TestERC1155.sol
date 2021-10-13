// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.4;

import '../ERC1155/ERC1155Tradable.sol';

contract TestERC1155 is ERC1155Tradable {
    constructor(string memory _baseUri, address _proxy) ERC1155Tradable('Test Collection', 'ERC1155', _proxy) {
        _setBaseMetadataURI(_baseUri);
    }
}
