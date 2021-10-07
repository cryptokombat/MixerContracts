//SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

interface ICollection {
    function totalSupply(uint256 _id) external view returns (uint256);

    function maxSupply(uint256 _id) external view returns (uint256);

    function mint(
        address _to,
        uint256 _id,
        uint256 _quantity,
        bytes memory _data
    ) external;

    function mintBatch(
        address _to,
        uint256[] memory _ids,
        uint256[] memory _quantities,
        bytes memory _data
    ) external;

    function burn(
        address _from,
        uint256 _id,
        uint256 _quantity,
        bytes memory _data
    ) external;

    function burnBatch(
        address _from,
        uint256[] memory _ids,
        uint256[] memory _quantities,
        bytes memory _data
    ) external;
}
